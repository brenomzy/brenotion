import {
  paginationOptsValidator,
  paginationResultValidator,
} from 'convex/server';
import { ConvexError, v } from 'convex/values';

import { query } from './_generated/server';
import { requireAuthorizedOwner } from './lib/authorization';
import {
  brlMoneyValidator,
  importFormatValidator,
  sourceAccountKindValidator,
} from './schema';

const MAX_HISTORY_PAGE_SIZE = 50;

const confirmedBatchValidator = v.object({
  batchId: v.id('importBatches'),
  format: importFormatValidator,
  sourceAccountKind: sourceAccountKindValidator,
  parserVersion: v.string(),
  periodStart: v.string(),
  periodEnd: v.string(),
  statementTitle: v.union(v.string(), v.null()),
  statementCompetence: v.union(v.string(), v.null()),
  statementDueOn: v.union(v.string(), v.null()),
  statementTotal: v.union(brlMoneyValidator, v.null()),
  purchaseTotal: v.union(brlMoneyValidator, v.null()),
  creditAdjustmentTotal: v.union(brlMoneyValidator, v.null()),
  settlementTotal: v.union(brlMoneyValidator, v.null()),
  transactionCount: v.number(),
  duplicateCount: v.number(),
  insertedCount: v.number(),
  creditTotal: brlMoneyValidator,
  debitTotal: brlMoneyValidator,
  confirmedAt: v.number(),
});

const sourceTransactionValidator = v.object({
  transactionId: v.id('sourceTransactions'),
  importBatchId: v.id('importBatches'),
  postedOn: v.string(),
  amount: brlMoneyValidator,
  description: v.string(),
  transactionType: v.string(),
  sourceAccountKind: sourceAccountKindValidator,
  installmentCurrent: v.union(v.number(), v.null()),
  installmentTotal: v.union(v.number(), v.null()),
});

export const listConfirmedBatches = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(confirmedBatchValidator),
  handler: async (ctx, args) => {
    const { ownerId } = await requireAuthorizedOwner(ctx);
    validatePageSize(args.paginationOpts.numItems);

    const result = await ctx.db
      .query('importBatches')
      .withIndex('by_ownerId_and_status_and_confirmedAt', (q) =>
        q.eq('ownerId', ownerId).eq('status', 'confirmed'),
      )
      .order('desc')
      .paginate(args.paginationOpts);

    return {
      ...result,
      page: result.page.map((batch) => {
        if (
          batch.periodStart === undefined ||
          batch.periodEnd === undefined ||
          batch.insertedCount === undefined ||
          batch.confirmedAt === undefined
        ) {
          throw new ConvexError({ code: 'IMPORT_BATCH_INCOMPLETE' });
        }

        return {
          batchId: batch._id,
          format: batch.format,
          sourceAccountKind:
            batch.sourceAccountKind ??
            (batch.format === 'ofx' ? 'bankAccount' : 'creditCard'),
          parserVersion:
            batch.parserVersion ??
            (batch.format === 'ofx' ? 'legacy-itau-ofx-v1' : 'unknown'),
          periodStart: batch.periodStart,
          periodEnd: batch.periodEnd,
          statementTitle: batch.statementTitle ?? null,
          statementCompetence: batch.statementCompetence ?? null,
          statementDueOn: batch.statementDueOn ?? null,
          statementTotal: batch.statementTotal ?? null,
          purchaseTotal: batch.purchaseTotal ?? null,
          creditAdjustmentTotal: batch.creditAdjustmentTotal ?? null,
          settlementTotal: batch.settlementTotal ?? null,
          transactionCount: batch.transactionCount,
          duplicateCount: batch.duplicateCount,
          insertedCount: batch.insertedCount,
          creditTotal: batch.creditTotal,
          debitTotal: batch.debitTotal,
          confirmedAt: batch.confirmedAt,
        };
      }),
    };
  },
});

export const listSourceTransactions = query({
  args: {
    batchId: v.id('importBatches'),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(sourceTransactionValidator),
  handler: async (ctx, args) => {
    const { ownerId } = await requireAuthorizedOwner(ctx);
    validatePageSize(args.paginationOpts.numItems);

    const batch = await ctx.db.get('importBatches', args.batchId);
    if (!batch || batch.ownerId !== ownerId || batch.status !== 'confirmed') {
      throw new ConvexError({ code: 'IMPORT_BATCH_NOT_FOUND' });
    }

    const result = await ctx.db
      .query('sourceTransactions')
      .withIndex('by_ownerId_and_importBatchId_and_postedOn', (q) =>
        q.eq('ownerId', ownerId).eq('importBatchId', batch._id),
      )
      .order('desc')
      .paginate(args.paginationOpts);

    return {
      ...result,
      page: result.page.map((transaction) => ({
        transactionId: transaction._id,
        importBatchId: transaction.importBatchId,
        postedOn: transaction.postedOn,
        amount: transaction.amount,
        description: transaction.description,
        transactionType: transaction.transactionType,
        sourceAccountKind:
          transaction.sourceAccountKind ??
          (batch.format === 'ofx' ? 'bankAccount' : 'creditCard'),
        installmentCurrent: transaction.installmentCurrent ?? null,
        installmentTotal: transaction.installmentTotal ?? null,
      })),
    };
  },
});

function validatePageSize(numItems: number): void {
  if (
    !Number.isSafeInteger(numItems) ||
    numItems < 1 ||
    numItems > MAX_HISTORY_PAGE_SIZE
  ) {
    throw new ConvexError({
      code: 'INVALID_PAGINATION_LIMIT',
      maxPageSize: MAX_HISTORY_PAGE_SIZE,
    });
  }
}
