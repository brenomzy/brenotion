import { ConvexError, v } from 'convex/values';

import type { Id } from './_generated/dataModel';
import { mutation, query } from './_generated/server';
import { requireAuthorizedOwner } from './lib/authorization';
import { appendAuditEvent } from './lib/persistence';
import { economicNatureValidator } from './schema';

const MAX_GROUP_KEYS_PER_REQUEST = 100;
const MAX_GROUP_KEY_LENGTH = 2_048;
const MAX_NORMALIZED_DESCRIPTION_LENGTH = 512;
const GROUP_KEY_PATTERN =
  /^description-v1\|transaction-type=([^|]*)\|source-kind=([^|]*)\|basis=(normalized-description|original-description-fallback)\|description=([^|]*)$/;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/u;
const COMBINING_MARK_PATTERN = /\p{M}+/gu;
const SEPARATOR_PATTERN = /[^\p{L}\p{N}\s]+/gu;
const WHITESPACE_PATTERN = /\s+/gu;

const classificationDecisionValidator = v.object({
  decisionId: v.id('classificationDecisions'),
  groupKey: v.string(),
  normalizedDescription: v.string(),
  economicNature: economicNatureValidator,
  decidedAt: v.number(),
  updatedAt: v.number(),
});

export const upsert = mutation({
  args: {
    groupKey: v.string(),
    normalizedDescription: v.string(),
    economicNature: economicNatureValidator,
  },
  returns: v.object({
    status: v.union(v.literal('created'), v.literal('updated'), v.literal('unchanged')),
    decision: classificationDecisionValidator,
  }),
  handler: async (ctx, args) => {
    const { ownerId } = await requireAuthorizedOwner(ctx);
    validateGroupIdentity(args.groupKey, args.normalizedDescription);

    const existing = await ctx.db
      .query('classificationDecisions')
      .withIndex('by_ownerId_and_groupKey', (q) =>
        q.eq('ownerId', ownerId).eq('groupKey', args.groupKey),
      )
      .unique();

    if (
      existing?.normalizedDescription === args.normalizedDescription &&
      existing.economicNature === args.economicNature
    ) {
      return {
        status: 'unchanged' as const,
        decision: toClassificationDecision(existing),
      };
    }

    const updatedAt = Date.now();

    if (existing) {
      await ctx.db.patch('classificationDecisions', existing._id, {
        normalizedDescription: args.normalizedDescription,
        economicNature: args.economicNature,
        updatedAt,
      });
      await appendAuditEvent(
        ctx,
        ownerId,
        {
          action: 'classification_decision.upserted',
          targetType: 'classification_decision',
          targetId: existing._id,
        },
        updatedAt,
      );

      return {
        status: 'updated' as const,
        decision: {
          decisionId: existing._id,
          groupKey: existing.groupKey,
          normalizedDescription: args.normalizedDescription,
          economicNature: args.economicNature,
          decidedAt: existing.decidedAt,
          updatedAt,
        },
      };
    }

    const decisionId = await ctx.db.insert('classificationDecisions', {
      ownerId,
      groupKey: args.groupKey,
      normalizedDescription: args.normalizedDescription,
      economicNature: args.economicNature,
      decidedAt: updatedAt,
      updatedAt,
    });
    await appendAuditEvent(
      ctx,
      ownerId,
      {
        action: 'classification_decision.upserted',
        targetType: 'classification_decision',
        targetId: decisionId,
      },
      updatedAt,
    );

    return {
      status: 'created' as const,
      decision: {
        decisionId,
        groupKey: args.groupKey,
        normalizedDescription: args.normalizedDescription,
        economicNature: args.economicNature,
        decidedAt: updatedAt,
        updatedAt,
      },
    };
  },
});

export const listByGroupKeys = query({
  args: {
    groupKeys: v.array(v.string()),
  },
  returns: v.array(classificationDecisionValidator),
  handler: async (ctx, args) => {
    const { ownerId } = await requireAuthorizedOwner(ctx);
    validateGroupKeys(args.groupKeys);

    const decisions = [];

    for (const groupKey of args.groupKeys) {
      const decision = await ctx.db
        .query('classificationDecisions')
        .withIndex('by_ownerId_and_groupKey', (q) =>
          q.eq('ownerId', ownerId).eq('groupKey', groupKey),
        )
        .unique();

      if (decision) {
        decisions.push(toClassificationDecision(decision));
      }
    }

    return decisions;
  },
});

function validateGroupKeys(groupKeys: string[]): void {
  if (groupKeys.length > MAX_GROUP_KEYS_PER_REQUEST) {
    throw new ConvexError({
      code: 'TOO_MANY_CLASSIFICATION_GROUP_KEYS',
      maxGroupKeys: MAX_GROUP_KEYS_PER_REQUEST,
    });
  }

  if (new Set(groupKeys).size !== groupKeys.length) {
    throw new ConvexError({ code: 'DUPLICATE_CLASSIFICATION_GROUP_KEY' });
  }

  for (const groupKey of groupKeys) {
    parseGroupKey(groupKey);
  }
}

function validateGroupIdentity(groupKey: string, normalizedDescription: string): void {
  if (
    normalizedDescription.length > MAX_NORMALIZED_DESCRIPTION_LENGTH ||
    normalizedDescription !== normalizedDescription.trim() ||
    CONTROL_CHARACTER_PATTERN.test(normalizedDescription)
  ) {
    throw new ConvexError({ code: 'INVALID_NORMALIZED_DESCRIPTION' });
  }

  const parsedGroupKey = parseGroupKey(groupKey);

  if (
    (parsedGroupKey.basis === 'normalized-description' &&
      (normalizedDescription.length === 0 ||
        parsedGroupKey.description !== normalizedDescription ||
        normalizeDescriptionForValidation(normalizedDescription) !==
          normalizedDescription)) ||
    (parsedGroupKey.basis === 'original-description-fallback' &&
      normalizedDescription.length !== 0)
  ) {
    throw new ConvexError({ code: 'CLASSIFICATION_GROUP_IDENTITY_MISMATCH' });
  }
}

function parseGroupKey(groupKey: string): {
  basis: 'normalized-description' | 'original-description-fallback';
  description: string;
} {
  if (
    groupKey.length === 0 ||
    groupKey.length > MAX_GROUP_KEY_LENGTH ||
    groupKey !== groupKey.trim() ||
    CONTROL_CHARACTER_PATTERN.test(groupKey)
  ) {
    throw new ConvexError({ code: 'INVALID_CLASSIFICATION_GROUP_KEY' });
  }

  const match = GROUP_KEY_PATTERN.exec(groupKey);

  if (!match) {
    throw new ConvexError({ code: 'INVALID_CLASSIFICATION_GROUP_KEY' });
  }

  const transactionType = decodeGroupKeyPart(match[1]);
  const sourceKind = decodeGroupKeyPart(match[2]);
  const description = decodeGroupKeyPart(match[4]);

  if (
    encodeURIComponent(transactionType) !== match[1] ||
    encodeURIComponent(sourceKind) !== match[2] ||
    encodeURIComponent(description) !== match[4] ||
    transactionType.length === 0 ||
    normalizeMetadataForValidation(transactionType) !== transactionType ||
    normalizeMetadataForValidation(sourceKind) !== sourceKind ||
    CONTROL_CHARACTER_PATTERN.test(transactionType) ||
    CONTROL_CHARACTER_PATTERN.test(sourceKind) ||
    CONTROL_CHARACTER_PATTERN.test(description)
  ) {
    throw new ConvexError({ code: 'INVALID_CLASSIFICATION_GROUP_KEY' });
  }

  return {
    basis: match[3] as 'normalized-description' | 'original-description-fallback',
    description,
  };
}

function decodeGroupKeyPart(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    throw new ConvexError({ code: 'INVALID_CLASSIFICATION_GROUP_KEY' });
  }
}

function normalizeDescriptionForValidation(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .normalize('NFD')
    .replace(COMBINING_MARK_PATTERN, '')
    .replace(SEPARATOR_PATTERN, ' ')
    .replace(WHITESPACE_PATTERN, ' ')
    .trim();
}

function normalizeMetadataForValidation(value: string): string {
  return normalizeDescriptionForValidation(value);
}

function toClassificationDecision(decision: {
  _id: Id<'classificationDecisions'>;
  groupKey: string;
  normalizedDescription: string;
  economicNature: 'personal' | 'business' | 'mixed';
  decidedAt: number;
  updatedAt: number;
}) {
  return {
    decisionId: decision._id,
    groupKey: decision.groupKey,
    normalizedDescription: decision.normalizedDescription,
    economicNature: decision.economicNature,
    decidedAt: decision.decidedAt,
    updatedAt: decision.updatedAt,
  };
}
