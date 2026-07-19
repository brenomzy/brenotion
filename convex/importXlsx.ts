"use node";

import { ConvexError, v } from 'convex/values';

import { internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { action } from './_generated/server';
import { requireAuthorizedOwner } from './lib/authorization';
import {
  ITAU_CREDIT_CARD_XLSX_PARSER_VERSION,
  ItauCreditCardXlsxParseError,
  type ItauCreditCardXlsxParseErrorCode,
  MAX_ITAU_CREDIT_CARD_XLSX_FILE_SIZE_BYTES,
} from './lib/itauCreditCardStatement';
import { readItauCreditCardStatementFromXlsx } from './lib/itauCreditCardXlsxAdapter';
import { createCreditCardSourceKey } from './lib/sourceKey';
import {
  brlMoneyValidator,
  importBatchStatusValidator,
  importFormatValidator,
  sourceAccountKindValidator,
  sourcePatrimonyValidator,
} from './schema';

const acceptedXlsxContentTypes = new Set([
  'application/octet-stream',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
]);

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

type XlsxRejectionCode =
  | ItauCreditCardXlsxParseErrorCode
  | 'XLSX_FILE_TOO_LARGE'
  | 'XLSX_UNSUPPORTED_CONTENT_TYPE';

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
      { ...args, format: 'itauCreditCardXlsx' },
    );

    if (attachment.status === 'error') {
      throw new ConvexError({ code: attachment.code });
    }

    const metadataError = validateXlsxMetadata(attachment);
    if (metadataError) {
      await ctx.storage.delete(args.storageId);
      await ctx.runMutation(internal.imports.recordRejectedUpload, {
        uploadId: args.uploadId,
        fileHash: attachment.sha256,
        format: 'itauCreditCardXlsx',
        sourceAccountKind: 'creditCard',
        sourcePatrimony: attachment.sourcePatrimony,
        parserVersion: ITAU_CREDIT_CARD_XLSX_PARSER_VERSION,
        rejectionCode: metadataError,
        rawDeletedAt: Date.now(),
      });
      throw new ConvexError({ code: metadataError });
    }

    const blob = await ctx.storage.get(args.storageId);
    if (!blob) {
      throw new ConvexError({ code: 'OFX_UPLOAD_NOT_FOUND' });
    }

    try {
      const parsed = await readItauCreditCardStatementFromXlsx(
        await blob.arrayBuffer(),
      );
      const entries = await Promise.all(
        parsed.transactions.map(async (transaction) => ({
          sequence: transaction.sequence,
          sourceKey: await createCreditCardSourceKey({
            sourcePatrimony: attachment.sourcePatrimony,
            statementCompetence: parsed.statementCompetence,
            sequence: transaction.sequence,
            postedOn: transaction.postedOn,
            amountInMinorUnits: transaction.amountInMinorUnits,
            description: transaction.description,
            transactionType: transaction.transactionType,
            installmentCurrent: transaction.installmentCurrent,
            installmentTotal: transaction.installmentTotal,
          }),
          postedOn: transaction.postedOn,
          amountInMinorUnits: transaction.amountInMinorUnits,
          description: transaction.description,
          transactionType: transaction.transactionType,
          ...(transaction.installmentCurrent === null
            ? {}
            : {
                installmentCurrent: transaction.installmentCurrent,
                installmentTotal: transaction.installmentTotal!,
              }),
        })),
      );

      await ctx.storage.delete(args.storageId);

      return await ctx.runMutation(internal.imports.createOrReusePreview, {
        uploadId: args.uploadId,
        fileHash: attachment.sha256,
        format: 'itauCreditCardXlsx',
        sourceAccountKind: 'creditCard',
        sourcePatrimony: attachment.sourcePatrimony,
        parserVersion: ITAU_CREDIT_CARD_XLSX_PARSER_VERSION,
        periodStart: parsed.periodStart,
        periodEnd: parsed.periodEnd,
        statementTitle: parsed.statementTitle,
        statementCompetence: parsed.statementCompetence,
        statementDueOn: parsed.statementDueOn,
        statementTotalInMinorUnits: parsed.statementTotalInMinorUnits,
        purchaseTotalInMinorUnits: parsed.purchaseTotalInMinorUnits,
        creditAdjustmentTotalInMinorUnits:
          parsed.creditAdjustmentTotalInMinorUnits,
        settlementTotalInMinorUnits: parsed.settlementTotalInMinorUnits,
        creditTotalInMinorUnits: parsed.creditTotalInMinorUnits,
        debitTotalInMinorUnits: parsed.debitTotalInMinorUnits,
        entries,
        rawDeletedAt: Date.now(),
      });
    } catch (error) {
      const rejectionCode =
        error instanceof ItauCreditCardXlsxParseError
          ? error.code
          : ('XLSX_INVALID_FORMAT' as const);
      const existingBlob = await ctx.storage.get(args.storageId);
      if (existingBlob) {
        await ctx.storage.delete(args.storageId);
      }
      await ctx.runMutation(internal.imports.recordRejectedUpload, {
        uploadId: args.uploadId,
        fileHash: attachment.sha256,
        format: 'itauCreditCardXlsx',
        sourceAccountKind: 'creditCard',
        sourcePatrimony: attachment.sourcePatrimony,
        parserVersion: ITAU_CREDIT_CARD_XLSX_PARSER_VERSION,
        rejectionCode,
        rawDeletedAt: Date.now(),
      });
      throw new ConvexError({ code: rejectionCode });
    }
  },
});

function validateXlsxMetadata(metadata: {
  size: number;
  contentType: string | null;
}): XlsxRejectionCode | null {
  if (metadata.size <= 0) {
    return 'XLSX_EMPTY_FILE';
  }
  if (metadata.size > MAX_ITAU_CREDIT_CARD_XLSX_FILE_SIZE_BYTES) {
    return 'XLSX_FILE_TOO_LARGE';
  }
  if (
    metadata.contentType &&
    !acceptedXlsxContentTypes.has(
      metadata.contentType.toLowerCase().split(';')[0].trim(),
    )
  ) {
    return 'XLSX_UNSUPPORTED_CONTENT_TYPE';
  }
  return null;
}
