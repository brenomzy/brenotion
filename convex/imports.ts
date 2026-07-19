import { ConvexError, v } from 'convex/values';

import { internal } from './_generated/api';
import type { Doc, Id } from './_generated/dataModel';
import { action, internalMutation, mutation, type MutationCtx } from './_generated/server';
import { requireAuthorizedOwner } from './lib/authorization';
import {
  decodeOfxBytes,
  MAX_OFX_FILE_SIZE_BYTES,
  MAX_OFX_TRANSACTIONS,
  OfxParseError,
  type OfxParseErrorCode,
  parseOfx,
} from './lib/ofxParser';
import { appendAuditEvent } from './lib/persistence';
import { createOfxSourceKey } from './lib/sourceKey';
import {
  brlMoneyValidator,
  importBatchStatusValidator,
  importFormatValidator,
  sourceAccountKindValidator,
  sourcePatrimonyValidator,
} from './schema';

const PREVIEW_ROW_LIMIT = 8;
const UPLOAD_EXPIRATION_MS = 15 * 60 * 1_000;
const OFX_PARSER_VERSION = 'itau-ofx-v2';
const acceptedOfxContentTypes = new Set([
  'application/octet-stream',
  'application/ofx',
  'application/x-ofx',
  'text/ofx',
  'text/plain',
]);

const rejectionCodeValidator = v.union(
  v.literal('OFX_EMPTY_FILE'),
  v.literal('OFX_INVALID_FORMAT'),
  v.literal('OFX_UNSUPPORTED_CURRENCY'),
  v.literal('OFX_INVALID_PERIOD'),
  v.literal('OFX_INVALID_TRANSACTION'),
  v.literal('OFX_TOO_MANY_TRANSACTIONS'),
  v.literal('OFX_FILE_TOO_LARGE'),
  v.literal('OFX_UNSUPPORTED_CONTENT_TYPE'),
  v.literal('XLSX_EMPTY_FILE'),
  v.literal('XLSX_INVALID_FORMAT'),
  v.literal('XLSX_INVALID_SUMMARY'),
  v.literal('XLSX_INVALID_TRANSACTION'),
  v.literal('XLSX_SUBCENT_VALUE'),
  v.literal('XLSX_TOO_MANY_TRANSACTIONS'),
  v.literal('XLSX_TOTAL_MISMATCH'),
  v.literal('XLSX_FILE_TOO_LARGE'),
  v.literal('XLSX_UNSUPPORTED_CONTENT_TYPE'),
);

const previewRowValidator = v.object({
  postedOn: v.string(),
  amount: brlMoneyValidator,
  description: v.string(),
  transactionType: v.string(),
  installmentCurrent: v.union(v.number(), v.null()),
  installmentTotal: v.union(v.number(), v.null()),
  isDuplicate: v.boolean(),
});

const previewResultValidator = v.object({
  batchId: v.id('importBatches'),
  format: importFormatValidator,
  sourceAccountKind: sourceAccountKindValidator,
  sourcePatrimony: v.union(sourcePatrimonyValidator, v.null()),
  parserVersion: v.string(),
  status: importBatchStatusValidator,
  periodStart: v.union(v.string(), v.null()),
  periodEnd: v.union(v.string(), v.null()),
  statementTitle: v.union(v.string(), v.null()),
  statementCompetence: v.union(v.string(), v.null()),
  statementDueOn: v.union(v.string(), v.null()),
  statementTotal: v.union(brlMoneyValidator, v.null()),
  purchaseTotal: v.union(brlMoneyValidator, v.null()),
  creditAdjustmentTotal: v.union(brlMoneyValidator, v.null()),
  settlementTotal: v.union(brlMoneyValidator, v.null()),
  transactionCount: v.number(),
  duplicateCount: v.number(),
  creditTotal: brlMoneyValidator,
  debitTotal: brlMoneyValidator,
  rawFileStatus: v.literal('deleted'),
  insertedCount: v.union(v.number(), v.null()),
  previewRows: v.array(previewRowValidator),
});

const uploadAttachmentResultValidator = v.union(
  v.object({
    status: v.literal('ready'),
    sha256: v.string(),
    size: v.number(),
    contentType: v.union(v.string(), v.null()),
    sourcePatrimony: sourcePatrimonyValidator,
  }),
  v.object({
    status: v.literal('error'),
    code: v.union(
      v.literal('OFX_UPLOAD_NOT_FOUND'),
      v.literal('OFX_UPLOAD_EXPIRED'),
      v.literal('OFX_UPLOAD_ALREADY_USED'),
      v.literal('IMPORT_SOURCE_PATRIMONY_REQUIRED'),
    ),
  }),
);

type Money = {
  amountInMinorUnits: bigint;
  currency: 'BRL';
  minorUnit: 'cent';
};

type PreviewResult = {
  batchId: Id<'importBatches'>;
  format: 'ofx' | 'itauCreditCardXlsx';
  sourceAccountKind: 'bankAccount' | 'creditCard';
  sourcePatrimony: 'personal' | 'business' | null;
  parserVersion: string;
  status: 'preview' | 'confirmed' | 'discarded' | 'rejected';
  periodStart: string | null;
  periodEnd: string | null;
  statementTitle: string | null;
  statementCompetence: string | null;
  statementDueOn: string | null;
  statementTotal: Money | null;
  purchaseTotal: Money | null;
  creditAdjustmentTotal: Money | null;
  settlementTotal: Money | null;
  transactionCount: number;
  duplicateCount: number;
  creditTotal: Money;
  debitTotal: Money;
  rawFileStatus: 'deleted';
  insertedCount: number | null;
  previewRows: Array<{
    postedOn: string;
    amount: Money;
    description: string;
    transactionType: string;
    installmentCurrent: number | null;
    installmentTotal: number | null;
    isDuplicate: boolean;
  }>;
};

type PreparedEntry = {
  sequence: number;
  sourceKey: string;
  postedOn: string;
  amountInMinorUnits: bigint;
  description: string;
  transactionType: string;
  installmentCurrent?: number;
  installmentTotal?: number;
};

type UploadAttachmentResult =
  | {
      status: 'ready';
      sha256: string;
      size: number;
      contentType: string | null;
      sourcePatrimony: 'personal' | 'business';
    }
  | {
      status: 'error';
      code:
        | 'OFX_UPLOAD_NOT_FOUND'
        | 'OFX_UPLOAD_EXPIRED'
        | 'OFX_UPLOAD_ALREADY_USED'
        | 'IMPORT_SOURCE_PATRIMONY_REQUIRED';
    };

type RejectionCode =
  | OfxParseErrorCode
  | 'OFX_FILE_TOO_LARGE'
  | 'OFX_UNSUPPORTED_CONTENT_TYPE';

export const generateUploadUrl = mutation({
  args: {
    format: importFormatValidator,
    sourcePatrimony: sourcePatrimonyValidator,
  },
  returns: v.object({
    uploadId: v.id('importUploads'),
    uploadUrl: v.string(),
    expiresAt: v.number(),
  }),
  handler: async (ctx, args) => {
    const { ownerId } = await requireAuthorizedOwner(ctx);
    const now = Date.now();
    const expiresAt = now + UPLOAD_EXPIRATION_MS;
    const uploadId = await ctx.db.insert('importUploads', {
      ownerId,
      format: args.format,
      sourcePatrimony: args.sourcePatrimony,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
      expiresAt,
    });
    const uploadUrl = await ctx.storage.generateUploadUrl();
    await ctx.scheduler.runAt(expiresAt, internal.imports.cleanupExpiredUpload, { uploadId });

    return { uploadId, uploadUrl, expiresAt };
  },
});

export const cleanupUpload = mutation({
  args: {
    uploadId: v.id('importUploads'),
    storageId: v.id('_storage'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { ownerId } = await requireAuthorizedOwner(ctx);
    const upload = await ctx.db.get('importUploads', args.uploadId);

    if (!upload || upload.ownerId !== ownerId) {
      throw new ConvexError({ code: 'OFX_UPLOAD_NOT_FOUND' });
    }

    if (upload.status === 'consumed' || upload.status === 'cleaned') {
      return null;
    }

    if (upload.storageId && upload.storageId !== args.storageId) {
      throw new ConvexError({ code: 'OFX_UPLOAD_NOT_FOUND' });
    }

    const metadata = await ctx.db.system.get('_storage', args.storageId);
    if (metadata) {
      await ctx.storage.delete(args.storageId);
    }

    const now = Date.now();
    await ctx.db.patch('importUploads', upload._id, {
      status: 'cleaned',
      storageId: undefined,
      fileHash: metadata?.sha256 ?? upload.fileHash,
      cleanedAt: now,
      updatedAt: now,
    });
    await appendAuditEvent(
      ctx,
      ownerId,
      {
        action: 'import_upload.cleaned',
        targetType: 'import_upload',
        targetId: upload._id,
      },
      now,
    );

    return null;
  },
});

export const cleanupExpiredUpload = internalMutation({
  args: { uploadId: v.id('importUploads') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const upload = await ctx.db.get('importUploads', args.uploadId);

    if (
      !upload ||
      upload.status === 'consumed' ||
      upload.status === 'cleaned' ||
      upload.expiresAt > Date.now()
    ) {
      return null;
    }

    if (upload.storageId) {
      const metadata = await ctx.db.system.get('_storage', upload.storageId);
      if (metadata) {
        await ctx.storage.delete(upload.storageId);
      }
    }

    const now = Date.now();
    await ctx.db.patch('importUploads', upload._id, {
      status: 'cleaned',
      storageId: undefined,
      cleanedAt: now,
      updatedAt: now,
    });
    await appendAuditEvent(
      ctx,
      upload.ownerId,
      {
        action: 'import_upload.expired',
        targetType: 'import_upload',
        targetId: upload._id,
      },
      now,
    );

    return null;
  },
});

export const attachUpload = internalMutation({
  args: {
    uploadId: v.id('importUploads'),
    storageId: v.id('_storage'),
    format: importFormatValidator,
  },
  returns: uploadAttachmentResultValidator,
  handler: async (ctx, args): Promise<UploadAttachmentResult> => {
    const { ownerId } = await requireAuthorizedOwner(ctx);
    const upload = await ctx.db.get('importUploads', args.uploadId);

    if (!upload || upload.ownerId !== ownerId) {
      return { status: 'error', code: 'OFX_UPLOAD_NOT_FOUND' };
    }

    if (upload.status === 'consumed') {
      return { status: 'error', code: 'OFX_UPLOAD_ALREADY_USED' };
    }

    const metadata = await ctx.db.system.get('_storage', args.storageId);

    if (!upload.sourcePatrimony) {
      if (metadata) {
        await ctx.storage.delete(args.storageId);
      }
      const now = Date.now();
      await ctx.db.patch('importUploads', upload._id, {
        status: 'cleaned',
        storageId: undefined,
        fileHash: metadata?.sha256 ?? upload.fileHash,
        cleanedAt: upload.cleanedAt ?? now,
        updatedAt: now,
      });
      return { status: 'error', code: 'IMPORT_SOURCE_PATRIMONY_REQUIRED' };
    }

    if ((upload.format ?? 'ofx') !== args.format) {
      if (metadata) {
        await ctx.storage.delete(args.storageId);
      }
      const now = Date.now();
      await ctx.db.patch('importUploads', upload._id, {
        status: 'cleaned',
        storageId: undefined,
        fileHash: metadata?.sha256 ?? upload.fileHash,
        cleanedAt: upload.cleanedAt ?? now,
        updatedAt: now,
      });
      return { status: 'error', code: 'OFX_UPLOAD_ALREADY_USED' };
    }

    if (upload.status === 'cleaned' || upload.expiresAt <= Date.now()) {
      if (metadata) {
        await ctx.storage.delete(args.storageId);
      }
      const now = Date.now();
      await ctx.db.patch('importUploads', upload._id, {
        status: 'cleaned',
        storageId: undefined,
        fileHash: metadata?.sha256 ?? upload.fileHash,
        cleanedAt: upload.cleanedAt ?? now,
        updatedAt: now,
      });
      if (metadata) {
        await appendAuditEvent(
          ctx,
          ownerId,
          {
            action: 'import_upload.cleaned',
            targetType: 'import_upload',
            targetId: upload._id,
          },
          now,
        );
      }
      return { status: 'error', code: 'OFX_UPLOAD_EXPIRED' };
    }

    if (!metadata || (upload.storageId && upload.storageId !== args.storageId)) {
      return { status: 'error', code: 'OFX_UPLOAD_NOT_FOUND' };
    }

    const now = Date.now();
    await ctx.db.patch('importUploads', upload._id, {
      status: 'attached',
      storageId: args.storageId,
      fileHash: metadata.sha256,
      attachedAt: upload.attachedAt ?? now,
      updatedAt: now,
    });

    return {
      status: 'ready',
      sha256: metadata.sha256,
      size: metadata.size,
      contentType: metadata.contentType ?? null,
      sourcePatrimony: upload.sourcePatrimony,
    };
  },
});

export const createPreview = action({
  args: {
    uploadId: v.id('importUploads'),
    storageId: v.id('_storage'),
  },
  returns: previewResultValidator,
  handler: async (ctx, args): Promise<PreviewResult> => {
    await requireAuthorizedOwner(ctx);
    const attachment: UploadAttachmentResult = await ctx.runMutation(
      internal.imports.attachUpload,
      { ...args, format: 'ofx' },
    );

    if (attachment.status === 'error') {
      throw new ConvexError({ code: attachment.code });
    }

    const metadataError = validateMetadata(attachment);
    if (metadataError) {
      await ctx.storage.delete(args.storageId);
      await ctx.runMutation(internal.imports.recordRejectedUpload, {
        uploadId: args.uploadId,
        fileHash: attachment.sha256,
        format: 'ofx',
        sourceAccountKind: 'bankAccount',
        sourcePatrimony: attachment.sourcePatrimony,
        parserVersion: OFX_PARSER_VERSION,
        rejectionCode: metadataError,
        rawDeletedAt: Date.now(),
      });
      throw new ConvexError({ code: metadataError });
    }

    const blob = await ctx.storage.get(args.storageId);
    if (!blob) {
      throw new ConvexError({ code: 'OFX_UPLOAD_NOT_FOUND' });
    }

    let prepared: {
      periodStart: string;
      periodEnd: string;
      creditTotalInMinorUnits: bigint;
      debitTotalInMinorUnits: bigint;
      entries: PreparedEntry[];
    };

    try {
      const parsed = parseOfx(decodeOfxBytes(await blob.arrayBuffer()));
      const entries = await Promise.all(
        parsed.transactions.map(async (transaction) => ({
          sequence: transaction.sequence,
          sourceKey: await createOfxSourceKey({
            sourcePatrimony: attachment.sourcePatrimony,
            externalId: transaction.externalId,
            postedOn: transaction.postedOn,
            amountInMinorUnits: transaction.amountInMinorUnits,
            description: transaction.description,
          }),
          postedOn: transaction.postedOn,
          amountInMinorUnits: transaction.amountInMinorUnits,
          description: transaction.description,
          transactionType: transaction.transactionType,
        })),
      );
      prepared = {
        periodStart: parsed.periodStart,
        periodEnd: parsed.periodEnd,
        creditTotalInMinorUnits: parsed.creditTotalInMinorUnits,
        debitTotalInMinorUnits: parsed.debitTotalInMinorUnits,
        entries,
      };
    } catch (error) {
      const rejectionCode =
        error instanceof OfxParseError ? error.code : ('OFX_INVALID_FORMAT' as const);
      await ctx.storage.delete(args.storageId);
      await ctx.runMutation(internal.imports.recordRejectedUpload, {
        uploadId: args.uploadId,
        fileHash: attachment.sha256,
        format: 'ofx',
        sourceAccountKind: 'bankAccount',
        sourcePatrimony: attachment.sourcePatrimony,
        parserVersion: OFX_PARSER_VERSION,
        rejectionCode,
        rawDeletedAt: Date.now(),
      });
      throw new ConvexError({ code: rejectionCode });
    }

    await ctx.storage.delete(args.storageId);

    return await ctx.runMutation(internal.imports.createOrReusePreview, {
      uploadId: args.uploadId,
      fileHash: attachment.sha256,
      format: 'ofx',
      sourceAccountKind: 'bankAccount',
      sourcePatrimony: attachment.sourcePatrimony,
      parserVersion: OFX_PARSER_VERSION,
      periodStart: prepared.periodStart,
      periodEnd: prepared.periodEnd,
      creditTotalInMinorUnits: prepared.creditTotalInMinorUnits,
      debitTotalInMinorUnits: prepared.debitTotalInMinorUnits,
      entries: prepared.entries,
      rawDeletedAt: Date.now(),
    });
  },
});

export const createOrReusePreview = internalMutation({
  args: {
    uploadId: v.id('importUploads'),
    fileHash: v.string(),
    format: importFormatValidator,
    sourceAccountKind: sourceAccountKindValidator,
    sourcePatrimony: sourcePatrimonyValidator,
    parserVersion: v.string(),
    periodStart: v.string(),
    periodEnd: v.string(),
    statementTitle: v.optional(v.string()),
    statementCompetence: v.optional(v.string()),
    statementDueOn: v.optional(v.string()),
    statementTotalInMinorUnits: v.optional(v.int64()),
    purchaseTotalInMinorUnits: v.optional(v.int64()),
    creditAdjustmentTotalInMinorUnits: v.optional(v.int64()),
    settlementTotalInMinorUnits: v.optional(v.int64()),
    creditTotalInMinorUnits: v.int64(),
    debitTotalInMinorUnits: v.int64(),
    entries: v.array(
      v.object({
        sequence: v.number(),
        sourceKey: v.string(),
        postedOn: v.string(),
        amountInMinorUnits: v.int64(),
        description: v.string(),
        transactionType: v.string(),
        installmentCurrent: v.optional(v.number()),
        installmentTotal: v.optional(v.number()),
      }),
    ),
    rawDeletedAt: v.number(),
  },
  returns: previewResultValidator,
  handler: async (ctx, args): Promise<PreviewResult> => {
    const { ownerId } = await requireAuthorizedOwner(ctx);
    validatePreparedEntries(args.entries);
    await consumeUpload(ctx, args.uploadId, ownerId, args.fileHash, args.rawDeletedAt);

    const existing = await ctx.db
      .query('importBatches')
      .withIndex('by_ownerId_and_fileHash', (q) =>
        q.eq('ownerId', ownerId).eq('fileHash', args.fileHash),
      )
      .unique();

    if (existing && existing.status !== 'discarded' && existing.status !== 'rejected') {
      await appendBankFileDeletedAudit(ctx, ownerId, existing._id, args.rawDeletedAt);
      return await buildPreviewResult(ctx, existing);
    }

    const duplicateSequences = await findDuplicateSequences(ctx, ownerId, args.entries);
    const now = Date.now();
    let batchId: Id<'importBatches'>;

    if (existing) {
      batchId = existing._id;
      await ctx.db.patch('importBatches', batchId, {
        format: args.format,
        sourceAccountKind: args.sourceAccountKind,
        sourcePatrimony: args.sourcePatrimony,
        parserVersion: args.parserVersion,
        status: 'preview',
        periodStart: args.periodStart,
        periodEnd: args.periodEnd,
        statementTitle: args.statementTitle,
        statementCompetence: args.statementCompetence,
        statementDueOn: args.statementDueOn,
        statementTotal:
          args.statementTotalInMinorUnits === undefined
            ? undefined
            : money(args.statementTotalInMinorUnits),
        purchaseTotal:
          args.purchaseTotalInMinorUnits === undefined
            ? undefined
            : money(args.purchaseTotalInMinorUnits),
        creditAdjustmentTotal:
          args.creditAdjustmentTotalInMinorUnits === undefined
            ? undefined
            : money(args.creditAdjustmentTotalInMinorUnits),
        settlementTotal:
          args.settlementTotalInMinorUnits === undefined
            ? undefined
            : money(args.settlementTotalInMinorUnits),
        transactionCount: args.entries.length,
        duplicateCount: duplicateSequences.size,
        creditTotal: money(args.creditTotalInMinorUnits),
        debitTotal: money(args.debitTotalInMinorUnits),
        rejectionCode: undefined,
        rawDeletedAt: args.rawDeletedAt,
        insertedCount: undefined,
        confirmedAt: undefined,
        discardedAt: undefined,
        updatedAt: now,
      });
    } else {
      batchId = await ctx.db.insert('importBatches', {
        ownerId,
        fileHash: args.fileHash,
        format: args.format,
        sourceAccountKind: args.sourceAccountKind,
        sourcePatrimony: args.sourcePatrimony,
        parserVersion: args.parserVersion,
        status: 'preview',
        periodStart: args.periodStart,
        periodEnd: args.periodEnd,
        statementTitle: args.statementTitle,
        statementCompetence: args.statementCompetence,
        statementDueOn: args.statementDueOn,
        statementTotal:
          args.statementTotalInMinorUnits === undefined
            ? undefined
            : money(args.statementTotalInMinorUnits),
        purchaseTotal:
          args.purchaseTotalInMinorUnits === undefined
            ? undefined
            : money(args.purchaseTotalInMinorUnits),
        creditAdjustmentTotal:
          args.creditAdjustmentTotalInMinorUnits === undefined
            ? undefined
            : money(args.creditAdjustmentTotalInMinorUnits),
        settlementTotal:
          args.settlementTotalInMinorUnits === undefined
            ? undefined
            : money(args.settlementTotalInMinorUnits),
        transactionCount: args.entries.length,
        duplicateCount: duplicateSequences.size,
        creditTotal: money(args.creditTotalInMinorUnits),
        debitTotal: money(args.debitTotalInMinorUnits),
        rawFileStatus: 'deleted',
        rawDeletedAt: args.rawDeletedAt,
        createdAt: now,
        updatedAt: now,
      });
    }

    await insertPreviewEntries(
      ctx,
      ownerId,
      batchId,
      args.sourceAccountKind,
      args.sourcePatrimony,
      args.entries,
      duplicateSequences,
    );
    await appendAuditEvent(
      ctx,
      ownerId,
      {
        action: 'import_batch.preview_created',
        targetType: 'import_batch',
        targetId: batchId,
      },
      now,
    );
    await appendBankFileDeletedAudit(ctx, ownerId, batchId, args.rawDeletedAt);

    const batch = await ctx.db.get('importBatches', batchId);
    if (!batch) {
      throw new ConvexError({ code: 'IMPORT_BATCH_NOT_FOUND' });
    }

    return await buildPreviewResult(ctx, batch);
  },
});

export const recordRejectedUpload = internalMutation({
  args: {
    uploadId: v.id('importUploads'),
    fileHash: v.string(),
    format: importFormatValidator,
    sourceAccountKind: sourceAccountKindValidator,
    sourcePatrimony: sourcePatrimonyValidator,
    parserVersion: v.string(),
    rejectionCode: rejectionCodeValidator,
    rawDeletedAt: v.number(),
  },
  returns: v.id('importBatches'),
  handler: async (ctx, args) => {
    const { ownerId } = await requireAuthorizedOwner(ctx);
    await consumeUpload(ctx, args.uploadId, ownerId, args.fileHash, args.rawDeletedAt);
    const existing = await ctx.db
      .query('importBatches')
      .withIndex('by_ownerId_and_fileHash', (q) =>
        q.eq('ownerId', ownerId).eq('fileHash', args.fileHash),
      )
      .unique();
    const now = Date.now();
    const batchId =
      existing?._id ??
      (await ctx.db.insert('importBatches', {
        ownerId,
        fileHash: args.fileHash,
        format: args.format,
        sourceAccountKind: args.sourceAccountKind,
        sourcePatrimony: args.sourcePatrimony,
        parserVersion: args.parserVersion,
        status: 'rejected',
        transactionCount: 0,
        duplicateCount: 0,
        creditTotal: money(0n),
        debitTotal: money(0n),
        rejectionCode: args.rejectionCode,
        rawFileStatus: 'deleted',
        rawDeletedAt: args.rawDeletedAt,
        createdAt: now,
        updatedAt: now,
      }));

    if (!existing) {
      await appendAuditEvent(
        ctx,
        ownerId,
        {
          action: 'import_batch.rejected',
          targetType: 'import_batch',
          targetId: batchId,
        },
        now,
      );
    }
    await appendBankFileDeletedAudit(ctx, ownerId, batchId, args.rawDeletedAt);

    return batchId;
  },
});

export const confirmBatch = mutation({
  args: { batchId: v.id('importBatches') },
  returns: previewResultValidator,
  handler: async (ctx, args): Promise<PreviewResult> => {
    const { ownerId } = await requireAuthorizedOwner(ctx);
    const batch = await requireOwnedBatch(ctx, args.batchId, ownerId);

    if (batch.status === 'confirmed') {
      return await buildPreviewResult(ctx, batch);
    }
    if (batch.status !== 'preview') {
      throw new ConvexError({ code: 'IMPORT_BATCH_NOT_CONFIRMABLE' });
    }
    if (!batch.sourcePatrimony) {
      throw new ConvexError({ code: 'IMPORT_SOURCE_PATRIMONY_REQUIRED' });
    }

    const entries = await ctx.db
      .query('importBatchEntries')
      .withIndex('by_batchId_and_sequence', (q) => q.eq('batchId', batch._id))
      .take(MAX_OFX_TRANSACTIONS + 1);

    if (entries.length !== batch.transactionCount || entries.length > MAX_OFX_TRANSACTIONS) {
      throw new ConvexError({ code: 'IMPORT_BATCH_INCOMPLETE' });
    }

    let insertedCount = 0;
    const now = Date.now();
    for (const entry of entries) {
      const existing = await ctx.db
        .query('sourceTransactions')
        .withIndex('by_ownerId_and_sourceKey', (q) =>
          q.eq('ownerId', ownerId).eq('sourceKey', entry.sourceKey),
        )
        .unique();

      if (!existing) {
        await ctx.db.insert('sourceTransactions', {
          ownerId,
          sourceKey: entry.sourceKey,
          importBatchId: batch._id,
          postedOn: entry.postedOn,
          amount: entry.amount,
          description: entry.description,
          transactionType: entry.transactionType,
          sourceAccountKind: entry.sourceAccountKind ?? batch.sourceAccountKind,
          sourcePatrimony: entry.sourcePatrimony ?? batch.sourcePatrimony,
          installmentCurrent: entry.installmentCurrent,
          installmentTotal: entry.installmentTotal,
          createdAt: now,
        });
        insertedCount += 1;
      }
    }

    await ctx.db.patch('importBatches', batch._id, {
      status: 'confirmed',
      insertedCount,
      duplicateCount: entries.length - insertedCount,
      confirmedAt: now,
      updatedAt: now,
    });
    await appendAuditEvent(
      ctx,
      ownerId,
      {
        action: 'import_batch.confirmed',
        targetType: 'import_batch',
        targetId: batch._id,
      },
      now,
    );

    const confirmed = await ctx.db.get('importBatches', batch._id);
    if (!confirmed) {
      throw new ConvexError({ code: 'IMPORT_BATCH_NOT_FOUND' });
    }

    return await buildPreviewResult(ctx, confirmed);
  },
});

export const discardBatch = mutation({
  args: { batchId: v.id('importBatches') },
  returns: v.object({
    batchId: v.id('importBatches'),
    status: v.literal('discarded'),
  }),
  handler: async (ctx, args) => {
    const { ownerId } = await requireAuthorizedOwner(ctx);
    const batch = await requireOwnedBatch(ctx, args.batchId, ownerId);

    if (batch.status === 'discarded') {
      return { batchId: batch._id, status: 'discarded' as const };
    }
    if (batch.status !== 'preview') {
      throw new ConvexError({ code: 'IMPORT_BATCH_NOT_DISCARDABLE' });
    }

    const entries = await ctx.db
      .query('importBatchEntries')
      .withIndex('by_batchId_and_sequence', (q) => q.eq('batchId', batch._id))
      .take(MAX_OFX_TRANSACTIONS + 1);
    if (entries.length > MAX_OFX_TRANSACTIONS) {
      throw new ConvexError({ code: 'IMPORT_BATCH_INCOMPLETE' });
    }
    for (const entry of entries) {
      await ctx.db.delete('importBatchEntries', entry._id);
    }

    const now = Date.now();
    await ctx.db.patch('importBatches', batch._id, {
      status: 'discarded',
      discardedAt: now,
      updatedAt: now,
    });
    await appendAuditEvent(
      ctx,
      ownerId,
      {
        action: 'import_batch.discarded',
        targetType: 'import_batch',
        targetId: batch._id,
      },
      now,
    );

    return { batchId: batch._id, status: 'discarded' as const };
  },
});

async function buildPreviewResult(
  ctx: MutationCtx,
  batch: Doc<'importBatches'>,
): Promise<PreviewResult> {
  const entries =
    batch.status === 'rejected'
      ? []
      : await ctx.db
          .query('importBatchEntries')
          .withIndex('by_batchId_and_sequence', (q) => q.eq('batchId', batch._id))
          .take(PREVIEW_ROW_LIMIT);

  return {
    batchId: batch._id,
    status: batch.status,
    periodStart: batch.periodStart ?? null,
    periodEnd: batch.periodEnd ?? null,
    format: batch.format,
    sourceAccountKind:
      batch.sourceAccountKind ?? (batch.format === 'ofx' ? 'bankAccount' : 'creditCard'),
    sourcePatrimony: batch.sourcePatrimony ?? null,
    parserVersion:
      batch.parserVersion ?? (batch.format === 'ofx' ? 'legacy-itau-ofx-v1' : 'unknown'),
    statementTitle: batch.statementTitle ?? null,
    statementCompetence: batch.statementCompetence ?? null,
    statementDueOn: batch.statementDueOn ?? null,
    statementTotal: batch.statementTotal ?? null,
    purchaseTotal: batch.purchaseTotal ?? null,
    creditAdjustmentTotal: batch.creditAdjustmentTotal ?? null,
    settlementTotal: batch.settlementTotal ?? null,
    transactionCount: batch.transactionCount,
    duplicateCount: batch.duplicateCount,
    creditTotal: batch.creditTotal,
    debitTotal: batch.debitTotal,
    rawFileStatus: batch.rawFileStatus,
    insertedCount: batch.insertedCount ?? null,
    previewRows: entries.map((entry) => ({
      postedOn: entry.postedOn,
      amount: entry.amount,
      description: entry.description,
      transactionType: entry.transactionType,
      installmentCurrent: entry.installmentCurrent ?? null,
      installmentTotal: entry.installmentTotal ?? null,
      isDuplicate: entry.isDuplicate,
    })),
  };
}

async function requireOwnedBatch(
  ctx: MutationCtx,
  batchId: Id<'importBatches'>,
  ownerId: string,
): Promise<Doc<'importBatches'>> {
  const batch = await ctx.db.get('importBatches', batchId);
  if (!batch || batch.ownerId !== ownerId) {
    throw new ConvexError({ code: 'IMPORT_BATCH_NOT_FOUND' });
  }
  return batch;
}

async function consumeUpload(
  ctx: MutationCtx,
  uploadId: Id<'importUploads'>,
  ownerId: string,
  fileHash: string,
  consumedAt: number,
): Promise<void> {
  const upload = await ctx.db.get('importUploads', uploadId);
  if (
    !upload ||
    upload.ownerId !== ownerId ||
    upload.status !== 'attached' ||
    upload.fileHash !== fileHash
  ) {
    throw new ConvexError({ code: 'OFX_UPLOAD_NOT_FOUND' });
  }
  await ctx.db.patch('importUploads', upload._id, {
    status: 'consumed',
    storageId: undefined,
    consumedAt,
    updatedAt: consumedAt,
  });
}

async function findDuplicateSequences(
  ctx: MutationCtx,
  ownerId: string,
  entries: PreparedEntry[],
): Promise<Set<number>> {
  const duplicates = new Set<number>();
  const seenSourceKeys = new Set<string>();

  for (const entry of entries) {
    if (seenSourceKeys.has(entry.sourceKey)) {
      duplicates.add(entry.sequence);
      continue;
    }
    seenSourceKeys.add(entry.sourceKey);
    const existing = await ctx.db
      .query('sourceTransactions')
      .withIndex('by_ownerId_and_sourceKey', (q) =>
        q.eq('ownerId', ownerId).eq('sourceKey', entry.sourceKey),
      )
      .unique();
    if (existing) {
      duplicates.add(entry.sequence);
    }
  }

  return duplicates;
}

async function insertPreviewEntries(
  ctx: MutationCtx,
  ownerId: string,
  batchId: Id<'importBatches'>,
  sourceAccountKind: 'bankAccount' | 'creditCard',
  sourcePatrimony: 'personal' | 'business',
  entries: PreparedEntry[],
  duplicateSequences: Set<number>,
): Promise<void> {
  for (const entry of entries) {
    await ctx.db.insert('importBatchEntries', {
      ownerId,
      batchId,
      sequence: entry.sequence,
      sourceKey: entry.sourceKey,
      postedOn: entry.postedOn,
      amount: money(entry.amountInMinorUnits),
      description: entry.description,
      transactionType: entry.transactionType,
      sourceAccountKind,
      sourcePatrimony,
      installmentCurrent: entry.installmentCurrent,
      installmentTotal: entry.installmentTotal,
      isDuplicate: duplicateSequences.has(entry.sequence),
    });
  }
}

async function appendBankFileDeletedAudit(
  ctx: MutationCtx,
  ownerId: string,
  batchId: Id<'importBatches'>,
  occurredAt: number,
): Promise<void> {
  await appendAuditEvent(
    ctx,
    ownerId,
    {
      action: 'bank_file.deleted',
      targetType: 'import_batch',
      targetId: batchId,
    },
    occurredAt,
  );
}

function validatePreparedEntries(entries: PreparedEntry[]): void {
  if (entries.length === 0 || entries.length > MAX_OFX_TRANSACTIONS) {
    throw new ConvexError({ code: 'OFX_INVALID_TRANSACTION' });
  }
  const sequences = new Set(entries.map((entry) => entry.sequence));
  if (sequences.size !== entries.length) {
    throw new ConvexError({ code: 'OFX_INVALID_TRANSACTION' });
  }
  for (const entry of entries) {
    if (
      !Number.isSafeInteger(entry.sequence) ||
      entry.sequence < 0 ||
      (entry.installmentCurrent === undefined) !==
        (entry.installmentTotal === undefined) ||
      (entry.installmentCurrent !== undefined &&
        (!Number.isSafeInteger(entry.installmentCurrent) ||
          !Number.isSafeInteger(entry.installmentTotal) ||
          entry.installmentCurrent < 1 ||
          entry.installmentTotal! < entry.installmentCurrent))
    ) {
      throw new ConvexError({ code: 'IMPORT_INVALID_ENTRY' });
    }
  }
}

function validateMetadata(metadata: {
  size: number;
  contentType: string | null;
}): RejectionCode | null {
  if (metadata.size <= 0) {
    return 'OFX_EMPTY_FILE';
  }
  if (metadata.size > MAX_OFX_FILE_SIZE_BYTES) {
    return 'OFX_FILE_TOO_LARGE';
  }
  if (
    metadata.contentType &&
    !acceptedOfxContentTypes.has(metadata.contentType.toLowerCase().split(';')[0].trim())
  ) {
    return 'OFX_UNSUPPORTED_CONTENT_TYPE';
  }
  return null;
}

function money(amountInMinorUnits: bigint): Money {
  return {
    amountInMinorUnits,
    currency: 'BRL',
    minorUnit: 'cent',
  };
}
