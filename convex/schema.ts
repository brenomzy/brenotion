import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export const brlMoneyValidator = v.object({
  amountInMinorUnits: v.int64(),
  currency: v.literal('BRL'),
  minorUnit: v.literal('cent'),
});

export const confidenceValidator = v.union(
  v.literal('recent'),
  v.literal('partial'),
  v.literal('stale'),
);

export default defineSchema({
  ownerProfiles: defineTable({
    ownerId: v.string(),
    preferredCurrency: v.literal('BRL'),
    locale: v.literal('pt-BR'),
    timeZone: v.string(),
    updatedAt: v.number(),
  }).index('by_ownerId', ['ownerId']),
  financialSnapshots: defineTable({
    ownerId: v.string(),
    availableToSpend: brlMoneyValidator,
    asOf: v.number(),
    timeZone: v.string(),
    confidence: confidenceValidator,
    calculationVersion: v.string(),
    updatedAt: v.number(),
  }).index('by_ownerId', ['ownerId']),
  auditEvents: defineTable({
    ownerId: v.string(),
    action: v.union(
      v.literal('owner_profile.created'),
      v.literal('owner_profile.preferences_updated'),
      v.literal('financial_snapshot.replaced'),
    ),
    targetType: v.union(v.literal('owner_profile'), v.literal('financial_snapshot')),
    targetId: v.union(v.id('ownerProfiles'), v.id('financialSnapshots')),
    result: v.literal('succeeded'),
    occurredAt: v.number(),
  }).index('by_ownerId_and_occurredAt', ['ownerId', 'occurredAt']),
});
