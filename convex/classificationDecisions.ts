import { ConvexError, v } from 'convex/values';

import type { Doc, Id } from './_generated/dataModel';
import { mutation, query, type MutationCtx } from './_generated/server';
import { requireAuthorizedOwner } from './lib/authorization';
import { appendAuditEvent } from './lib/persistence';
import { economicNatureValidator } from './schema';
import {
  normalizeCanonicalDescriptionText,
  parseTransactionDescriptionGroupKey,
} from '../shared/transaction-description-normalization';

const MAX_GROUP_KEYS_PER_REQUEST = 100;
const MAX_REVISION_ITEMS = 200;
const MAX_GROUP_KEY_LENGTH = 2_048;
const MAX_NORMALIZED_DESCRIPTION_LENGTH = 512;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/u;

const classificationDecisionValidator = v.object({
  decisionId: v.id('classificationDecisions'),
  groupKey: v.string(),
  normalizedDescription: v.string(),
  economicNature: economicNatureValidator,
  decidedAt: v.number(),
  updatedAt: v.number(),
});

const classificationDecisionRevisionValidator = v.object({
  revisionId: v.id('classificationDecisionRevisions'),
  revisionNumber: v.int64(),
  reason: v.union(
    v.literal('created'),
    v.literal('updated'),
    v.literal('legacyBaseline'),
  ),
  snapshot: v.object({
    groupKey: v.string(),
    normalizedDescription: v.string(),
    economicNature: economicNatureValidator,
    decidedAt: v.number(),
    updatedAt: v.number(),
  }),
  recordedAt: v.number(),
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
      const replacement = {
        ownerId,
        groupKey: existing.groupKey,
        normalizedDescription: args.normalizedDescription,
        economicNature: args.economicNature,
        decidedAt: existing.decidedAt,
        updatedAt,
      };
      const nextRevisionNumber = await prepareClassificationRevisionSequence(
        ctx,
        ownerId,
        existing,
        updatedAt,
      );
      const revisionId = await insertClassificationRevision(
        ctx,
        ownerId,
        existing._id,
        nextRevisionNumber,
        'updated',
        toClassificationSnapshot(replacement),
        updatedAt,
      );
      await ctx.db.replace('classificationDecisions', existing._id, {
        ...replacement,
        revisionNumber: nextRevisionNumber,
        currentRevisionId: revisionId,
      });
      await appendAuditEvent(
        ctx,
        ownerId,
        {
          action: 'classification_decision.upserted',
          targetType: 'classification_decision',
          targetId: existing._id,
          revisionId,
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
    const revisionNumber = 1n;
    const revisionId = await insertClassificationRevision(
      ctx,
      ownerId,
      decisionId,
      revisionNumber,
      'created',
      {
        groupKey: args.groupKey,
        normalizedDescription: args.normalizedDescription,
        economicNature: args.economicNature,
        decidedAt: updatedAt,
        updatedAt,
      },
      updatedAt,
    );
    await ctx.db.patch('classificationDecisions', decisionId, {
      revisionNumber,
      currentRevisionId: revisionId,
    });
    await appendAuditEvent(
      ctx,
      ownerId,
      {
        action: 'classification_decision.upserted',
        targetType: 'classification_decision',
        targetId: decisionId,
        revisionId,
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

export const listRevisions = query({
  args: {
    decisionId: v.id('classificationDecisions'),
  },
  returns: v.object({
    items: v.array(classificationDecisionRevisionValidator),
    isTruncated: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const { ownerId } = await requireAuthorizedOwner(ctx);
    const decision = await ctx.db.get('classificationDecisions', args.decisionId);

    if (!decision || decision.ownerId !== ownerId) {
      throw new ConvexError({ code: 'CLASSIFICATION_DECISION_NOT_FOUND' });
    }

    const revisions = await ctx.db
      .query('classificationDecisionRevisions')
      .withIndex('by_ownerId_and_decisionId_and_revisionNumber', (q) =>
        q.eq('ownerId', ownerId).eq('decisionId', args.decisionId),
      )
      .take(MAX_REVISION_ITEMS + 1);

    return {
      items: revisions.slice(0, MAX_REVISION_ITEMS).map((revision) => ({
        revisionId: revision._id,
        revisionNumber: revision.revisionNumber,
        reason: revision.reason,
        snapshot: revision.snapshot,
        recordedAt: revision.recordedAt,
      })),
      isTruncated: revisions.length > MAX_REVISION_ITEMS,
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

async function prepareClassificationRevisionSequence(
  ctx: MutationCtx,
  ownerId: string,
  existing: Doc<'classificationDecisions'>,
  recordedAt: number,
): Promise<bigint> {
  if (
    existing.revisionNumber !== undefined &&
    existing.currentRevisionId !== undefined
  ) {
    return existing.revisionNumber + 1n;
  }

  await insertClassificationRevision(
    ctx,
    ownerId,
    existing._id,
    1n,
    'legacyBaseline',
    toClassificationSnapshot(existing),
    recordedAt,
  );
  return 2n;
}

async function insertClassificationRevision(
  ctx: MutationCtx,
  ownerId: string,
  decisionId: Id<'classificationDecisions'>,
  revisionNumber: bigint,
  reason: 'created' | 'updated' | 'legacyBaseline',
  snapshot: Doc<'classificationDecisionRevisions'>['snapshot'],
  recordedAt: number,
): Promise<Id<'classificationDecisionRevisions'>> {
  return await ctx.db.insert('classificationDecisionRevisions', {
    ownerId,
    decisionId,
    revisionNumber,
    reason,
    snapshot,
    recordedAt,
  });
}

function toClassificationSnapshot(
  decision: Pick<
    Doc<'classificationDecisions'>,
    'groupKey' | 'normalizedDescription' | 'economicNature' | 'decidedAt' | 'updatedAt'
  >,
): Doc<'classificationDecisionRevisions'>['snapshot'] {
  return {
    groupKey: decision.groupKey,
    normalizedDescription: decision.normalizedDescription,
    economicNature: decision.economicNature,
    decidedAt: decision.decidedAt,
    updatedAt: decision.updatedAt,
  };
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
        normalizeCanonicalDescriptionText(normalizedDescription) !==
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

  const parsed = parseTransactionDescriptionGroupKey(groupKey);

  if (!parsed) {
    throw new ConvexError({ code: 'INVALID_CLASSIFICATION_GROUP_KEY' });
  }

  return {
    basis: parsed.groupingBasis,
    description: parsed.groupingText,
  };
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
