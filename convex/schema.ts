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

export const importBatchStatusValidator = v.union(
  v.literal('preview'),
  v.literal('confirmed'),
  v.literal('discarded'),
  v.literal('rejected'),
);

export const importUploadStatusValidator = v.union(
  v.literal('pending'),
  v.literal('attached'),
  v.literal('consumed'),
  v.literal('cleaned'),
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
  importUploads: defineTable({
    ownerId: v.string(),
    status: importUploadStatusValidator,
    storageId: v.optional(v.id('_storage')),
    fileHash: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    expiresAt: v.number(),
    attachedAt: v.optional(v.number()),
    consumedAt: v.optional(v.number()),
    cleanedAt: v.optional(v.number()),
  }).index('by_ownerId_and_createdAt', ['ownerId', 'createdAt']),
  importBatches: defineTable({
    ownerId: v.string(),
    fileHash: v.string(),
    format: v.literal('ofx'),
    status: importBatchStatusValidator,
    periodStart: v.optional(v.string()),
    periodEnd: v.optional(v.string()),
    transactionCount: v.number(),
    duplicateCount: v.number(),
    creditTotal: brlMoneyValidator,
    debitTotal: brlMoneyValidator,
    rejectionCode: v.optional(v.string()),
    rawFileStatus: v.literal('deleted'),
    rawDeletedAt: v.number(),
    insertedCount: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
    confirmedAt: v.optional(v.number()),
    discardedAt: v.optional(v.number()),
  })
    .index('by_ownerId_and_fileHash', ['ownerId', 'fileHash'])
    .index('by_ownerId_and_createdAt', ['ownerId', 'createdAt']),
  importBatchEntries: defineTable({
    ownerId: v.string(),
    batchId: v.id('importBatches'),
    sequence: v.number(),
    sourceKey: v.string(),
    postedOn: v.string(),
    amount: brlMoneyValidator,
    description: v.string(),
    transactionType: v.string(),
    isDuplicate: v.boolean(),
  }).index('by_batchId_and_sequence', ['batchId', 'sequence']),
  sourceTransactions: defineTable({
    ownerId: v.string(),
    sourceKey: v.string(),
    importBatchId: v.id('importBatches'),
    postedOn: v.string(),
    amount: brlMoneyValidator,
    description: v.string(),
    transactionType: v.string(),
    createdAt: v.number(),
  })
    .index('by_ownerId_and_sourceKey', ['ownerId', 'sourceKey'])
    .index('by_ownerId_and_postedOn', ['ownerId', 'postedOn']),
  auditEvents: defineTable({
    ownerId: v.string(),
    action: v.union(
      v.literal('owner_profile.created'),
      v.literal('owner_profile.preferences_updated'),
      v.literal('financial_snapshot.replaced'),
      v.literal('import_upload.expired'),
      v.literal('import_upload.cleaned'),
      v.literal('import_batch.preview_created'),
      v.literal('import_batch.confirmed'),
      v.literal('import_batch.discarded'),
      v.literal('import_batch.rejected'),
      v.literal('bank_file.deleted'),
    ),
    targetType: v.union(
      v.literal('owner_profile'),
      v.literal('financial_snapshot'),
      v.literal('import_upload'),
      v.literal('import_batch'),
    ),
    targetId: v.union(
      v.id('ownerProfiles'),
      v.id('financialSnapshots'),
      v.id('importUploads'),
      v.id('importBatches'),
    ),
    result: v.literal('succeeded'),
    occurredAt: v.number(),
  }).index('by_ownerId_and_occurredAt', ['ownerId', 'occurredAt']),
});
