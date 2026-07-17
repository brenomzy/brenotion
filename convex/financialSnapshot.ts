import { v } from 'convex/values';

import { internalMutation, query } from './_generated/server';
import { requireAuthorizedOwner } from './lib/authorization';
import { appendAuditEvent, normalizeTimeZone } from './lib/persistence';
import { brlMoneyValidator, confidenceValidator } from './schema';

const snapshotValidator = v.object({
  availableToSpend: brlMoneyValidator,
  asOf: v.number(),
  timeZone: v.string(),
  confidence: confidenceValidator,
  calculationVersion: v.string(),
  updatedAt: v.number(),
});

export const getCurrent = query({
  args: {},
  returns: v.union(snapshotValidator, v.null()),
  handler: async (ctx) => {
    const { ownerId } = await requireAuthorizedOwner(ctx);
    const snapshot = await ctx.db
      .query('financialSnapshots')
      .withIndex('by_ownerId', (q) => q.eq('ownerId', ownerId))
      .unique();

    if (!snapshot) {
      return null;
    }

    return toSnapshot(snapshot);
  },
});

export const replaceCurrent = internalMutation({
  args: {
    availableToSpend: brlMoneyValidator,
    asOf: v.number(),
    timeZone: v.string(),
    confidence: confidenceValidator,
    calculationVersion: v.string(),
  },
  returns: v.object({
    status: v.union(v.literal('created'), v.literal('replaced'), v.literal('unchanged')),
    snapshot: snapshotValidator,
  }),
  handler: async (ctx, args) => {
    const { ownerId } = await requireAuthorizedOwner(ctx);
    const timeZone = normalizeTimeZone(args.timeZone);
    const calculationVersion = args.calculationVersion.trim();

    if (!calculationVersion || calculationVersion.length > 64) {
      throw new Error('INVALID_CALCULATION_VERSION');
    }

    const existing = await ctx.db
      .query('financialSnapshots')
      .withIndex('by_ownerId', (q) => q.eq('ownerId', ownerId))
      .unique();

    if (
      existing &&
      existing.availableToSpend.amountInMinorUnits ===
        args.availableToSpend.amountInMinorUnits &&
      existing.asOf === args.asOf &&
      existing.timeZone === timeZone &&
      existing.confidence === args.confidence &&
      existing.calculationVersion === calculationVersion
    ) {
      return {
        status: 'unchanged' as const,
        snapshot: toSnapshot(existing),
      };
    }

    const updatedAt = Date.now();
    const snapshot = {
      ownerId,
      availableToSpend: args.availableToSpend,
      asOf: args.asOf,
      timeZone,
      confidence: args.confidence,
      calculationVersion,
      updatedAt,
    };

    const snapshotId = existing
      ? (await ctx.db.replace('financialSnapshots', existing._id, snapshot), existing._id)
      : await ctx.db.insert('financialSnapshots', snapshot);

    await appendAuditEvent(
      ctx,
      ownerId,
      {
        action: 'financial_snapshot.replaced',
        targetType: 'financial_snapshot',
        targetId: snapshotId,
      },
      updatedAt,
    );

    return {
      status: existing ? ('replaced' as const) : ('created' as const),
      snapshot: toSnapshot(snapshot),
    };
  },
});

function toSnapshot(snapshot: {
  availableToSpend: {
    amountInMinorUnits: bigint;
    currency: 'BRL';
    minorUnit: 'cent';
  };
  asOf: number;
  timeZone: string;
  confidence: 'recent' | 'partial' | 'stale';
  calculationVersion: string;
  updatedAt: number;
}) {
  return {
    availableToSpend: snapshot.availableToSpend,
    asOf: snapshot.asOf,
    timeZone: snapshot.timeZone,
    confidence: snapshot.confidence,
    calculationVersion: snapshot.calculationVersion,
    updatedAt: snapshot.updatedAt,
  };
}
