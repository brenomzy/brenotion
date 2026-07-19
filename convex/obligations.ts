import { ConvexError, v } from 'convex/values';

import type { Doc } from './_generated/dataModel';
import { mutation, query } from './_generated/server';
import { requireAuthorizedOwner } from './lib/authorization';
import { appendAuditEvent } from './lib/persistence';
import {
  brlMoneyValidator,
  businessSharePolicyValidator,
  economicNatureValidator,
  paymentOriginValidator,
} from './schema';

const MAX_LIST_ITEMS = 200;
const MIN_MIXED_BUSINESS_SHARE_BASIS_POINTS = 1n;
const MAX_MIXED_BUSINESS_SHARE_BASIS_POINTS = 9_999n;

const obligationValidator = v.object({
  obligationId: v.id('obligations'),
  obligationKey: v.string(),
  name: v.string(),
  economicNature: economicNatureValidator,
  businessSharePolicy: businessSharePolicyValidator,
  paymentOrigin: paymentOriginValidator,
  expectedAmount: v.optional(brlMoneyValidator),
  dueDayOfMonth: v.optional(v.number()),
  isActive: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

export const list = query({
  args: {
    includeInactive: v.optional(v.boolean()),
  },
  returns: v.object({
    items: v.array(obligationValidator),
    isTruncated: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const { ownerId } = await requireAuthorizedOwner(ctx);
    const queryResult = args.includeInactive
      ? ctx.db
          .query('obligations')
          .withIndex('by_ownerId_and_name', (q) => q.eq('ownerId', ownerId))
      : ctx.db
          .query('obligations')
          .withIndex('by_ownerId_and_isActive_and_name', (q) =>
            q.eq('ownerId', ownerId).eq('isActive', true),
          );
    const obligations = await queryResult.take(MAX_LIST_ITEMS + 1);

    return {
      items: obligations.slice(0, MAX_LIST_ITEMS).map(toObligation),
      isTruncated: obligations.length > MAX_LIST_ITEMS,
    };
  },
});

export const upsert = mutation({
  args: {
    obligationKey: v.string(),
    name: v.string(),
    economicNature: economicNatureValidator,
    businessSharePolicy: businessSharePolicyValidator,
    paymentOrigin: paymentOriginValidator,
    expectedAmount: v.optional(brlMoneyValidator),
    dueDayOfMonth: v.optional(v.number()),
    isActive: v.boolean(),
  },
  returns: v.object({
    status: v.union(v.literal('created'), v.literal('updated'), v.literal('unchanged')),
    obligation: obligationValidator,
  }),
  handler: async (ctx, args) => {
    const { ownerId } = await requireAuthorizedOwner(ctx);
    const obligationKey = normalizeObligationKey(args.obligationKey);
    const name = normalizeName(args.name);
    validateBusinessSharePolicy(args.economicNature, args.businessSharePolicy);
    validateExpectedAmount(args.expectedAmount);
    validateDueDayOfMonth(args.dueDayOfMonth);

    const existing = await ctx.db
      .query('obligations')
      .withIndex('by_ownerId_and_obligationKey', (q) =>
        q.eq('ownerId', ownerId).eq('obligationKey', obligationKey),
      )
      .unique();

    if (
      existing &&
      existing.name === name &&
      existing.economicNature === args.economicNature &&
      businessSharePoliciesEqual(
        existing.businessSharePolicy,
        args.businessSharePolicy,
      ) &&
      existing.paymentOrigin === args.paymentOrigin &&
      moneyValuesEqual(existing.expectedAmount, args.expectedAmount) &&
      existing.dueDayOfMonth === args.dueDayOfMonth &&
      existing.isActive === args.isActive
    ) {
      return {
        status: 'unchanged' as const,
        obligation: toObligation(existing),
      };
    }

    const updatedAt = Date.now();

    if (existing) {
      const replacement = {
        ownerId,
        obligationKey,
        name,
        economicNature: args.economicNature,
        businessSharePolicy: args.businessSharePolicy,
        paymentOrigin: args.paymentOrigin,
        expectedAmount: args.expectedAmount,
        dueDayOfMonth: args.dueDayOfMonth,
        isActive: args.isActive,
        createdAt: existing.createdAt,
        updatedAt,
      };
      await ctx.db.replace('obligations', existing._id, replacement);
      await appendAuditEvent(
        ctx,
        ownerId,
        {
          action: 'obligation.updated',
          targetType: 'obligation',
          targetId: existing._id,
        },
        updatedAt,
      );

      return {
        status: 'updated' as const,
        obligation: toObligation({ ...replacement, _id: existing._id }),
      };
    }

    const createdAt = updatedAt;
    const obligationId = await ctx.db.insert('obligations', {
      ownerId,
      obligationKey,
      name,
      economicNature: args.economicNature,
      businessSharePolicy: args.businessSharePolicy,
      paymentOrigin: args.paymentOrigin,
      expectedAmount: args.expectedAmount,
      dueDayOfMonth: args.dueDayOfMonth,
      isActive: args.isActive,
      createdAt,
      updatedAt,
    });
    await appendAuditEvent(
      ctx,
      ownerId,
      {
        action: 'obligation.created',
        targetType: 'obligation',
        targetId: obligationId,
      },
      updatedAt,
    );

    return {
      status: 'created' as const,
      obligation: {
        obligationId,
        obligationKey,
        name,
        economicNature: args.economicNature,
        businessSharePolicy: args.businessSharePolicy,
        paymentOrigin: args.paymentOrigin,
        expectedAmount: args.expectedAmount,
        dueDayOfMonth: args.dueDayOfMonth,
        isActive: args.isActive,
        createdAt,
        updatedAt,
      },
    };
  },
});

function normalizeObligationKey(value: string): string {
  const normalized = value.trim();

  if (!/^[a-z0-9][a-z0-9._-]{0,63}$/.test(normalized)) {
    throwValidationError('INVALID_OBLIGATION_KEY');
  }

  return normalized;
}

function normalizeName(value: string): string {
  const normalized = value.trim().replace(/\s+/g, ' ');

  if (normalized.length < 1 || normalized.length > 120) {
    throwValidationError('INVALID_OBLIGATION_NAME');
  }

  return normalized;
}

function validateBusinessSharePolicy(
  economicNature: 'personal' | 'business' | 'mixed',
  policy:
    | { status: 'notApplicable' }
    | { status: 'needsConfirmation' }
    | { status: 'confirmed'; basisPoints: bigint },
): void {
  if (economicNature !== 'mixed') {
    if (policy.status !== 'notApplicable') {
      throwValidationError('BUSINESS_SHARE_ONLY_FOR_MIXED_NATURE');
    }
    return;
  }

  if (policy.status === 'notApplicable') {
    throwValidationError('MIXED_BUSINESS_SHARE_REQUIRED');
  }

  if (
    policy.status === 'confirmed' &&
    (policy.basisPoints < MIN_MIXED_BUSINESS_SHARE_BASIS_POINTS ||
      policy.basisPoints > MAX_MIXED_BUSINESS_SHARE_BASIS_POINTS)
  ) {
    throwValidationError('INVALID_MIXED_BUSINESS_SHARE');
  }
}

function validateExpectedAmount(
  expectedAmount:
    | {
        amountInMinorUnits: bigint;
        currency: 'BRL';
        minorUnit: 'cent';
      }
    | undefined,
): void {
  if (expectedAmount && expectedAmount.amountInMinorUnits < 0n) {
    throwValidationError('INVALID_EXPECTED_AMOUNT');
  }
}

function validateDueDayOfMonth(dueDayOfMonth: number | undefined): void {
  if (
    dueDayOfMonth !== undefined &&
    (!Number.isInteger(dueDayOfMonth) || dueDayOfMonth < 1 || dueDayOfMonth > 31)
  ) {
    throwValidationError('INVALID_DUE_DAY_OF_MONTH');
  }
}

function businessSharePoliciesEqual(
  left: Doc<'obligations'>['businessSharePolicy'],
  right: Doc<'obligations'>['businessSharePolicy'],
): boolean {
  return (
    left.status === right.status &&
    (left.status !== 'confirmed' ||
      (right.status === 'confirmed' && left.basisPoints === right.basisPoints))
  );
}

function moneyValuesEqual(
  left: Doc<'obligations'>['expectedAmount'],
  right: Doc<'obligations'>['expectedAmount'],
): boolean {
  return (
    left === right ||
    (left !== undefined &&
      right !== undefined &&
      left.amountInMinorUnits === right.amountInMinorUnits)
  );
}

function toObligation(obligation: Pick<
  Doc<'obligations'>,
  | '_id'
  | 'obligationKey'
  | 'name'
  | 'economicNature'
  | 'businessSharePolicy'
  | 'paymentOrigin'
  | 'expectedAmount'
  | 'dueDayOfMonth'
  | 'isActive'
  | 'createdAt'
  | 'updatedAt'
>) {
  return {
    obligationId: obligation._id,
    obligationKey: obligation.obligationKey,
    name: obligation.name,
    economicNature: obligation.economicNature,
    businessSharePolicy: obligation.businessSharePolicy,
    paymentOrigin: obligation.paymentOrigin,
    expectedAmount: obligation.expectedAmount,
    dueDayOfMonth: obligation.dueDayOfMonth,
    isActive: obligation.isActive,
    createdAt: obligation.createdAt,
    updatedAt: obligation.updatedAt,
  };
}

function throwValidationError(code: string): never {
  throw new ConvexError({ code });
}
