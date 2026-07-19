import { ConvexError, v } from 'convex/values';

import type { Doc } from './_generated/dataModel';
import { mutation, query, type QueryCtx } from './_generated/server';
import {
  CARD_SETTLEMENT_MAX_DAY_DISTANCE,
  CARD_SETTLEMENT_RULE_VERSION,
  getCardSettlementDayDistance,
  isCardSettlementCandidate,
  shiftIsoDate,
} from './lib/cardSettlementReconciliation';
import { requireAuthorizedOwner } from './lib/authorization';
import { appendAuditEvent } from './lib/persistence';
import { brlMoneyValidator, sourcePatrimonyValidator } from './schema';

const MAX_SOURCE_TRANSACTIONS_PER_BATCH = 1_000;
const MAX_WINDOW_TRANSACTIONS = 1_000;
const nullableSourcePatrimonyValidator = v.union(sourcePatrimonyValidator, v.null());

const bankDebitValidator = v.object({
  transactionId: v.id('sourceTransactions'),
  postedOn: v.string(),
  amount: brlMoneyValidator,
  sourcePatrimony: sourcePatrimonyValidator,
  dayDistance: v.number(),
});

const confirmedReconciliationValidator = v.object({
  reconciliationId: v.id('cardSettlementReconciliations'),
  bankDebit: bankDebitValidator,
  confirmedAt: v.number(),
});

const statementPaymentValidator = v.object({
  transactionId: v.id('sourceTransactions'),
  postedOn: v.string(),
  amount: brlMoneyValidator,
  sourcePatrimony: nullableSourcePatrimonyValidator,
  reconciliation: v.union(confirmedReconciliationValidator, v.null()),
  candidates: v.array(bankDebitValidator),
});

export const listForStatementBatch = query({
  args: { batchId: v.id('importBatches') },
  returns: v.object({
    ruleVersion: v.literal(CARD_SETTLEMENT_RULE_VERSION),
    maximumDayDistance: v.number(),
    statementPayments: v.array(statementPaymentValidator),
  }),
  handler: async (ctx, args) => {
    const { ownerId } = await requireAuthorizedOwner(ctx);
    const batch = await ctx.db.get('importBatches', args.batchId);
    if (!batch || batch.ownerId !== ownerId || batch.status !== 'confirmed') {
      throw new ConvexError({ code: 'IMPORT_BATCH_NOT_FOUND' });
    }
    if (batch.format !== 'itauCreditCardXlsx') {
      return {
        ruleVersion: CARD_SETTLEMENT_RULE_VERSION,
        maximumDayDistance: CARD_SETTLEMENT_MAX_DAY_DISTANCE,
        statementPayments: [],
      };
    }

    const sourceTransactions = await ctx.db
      .query('sourceTransactions')
      .withIndex('by_ownerId_and_importBatchId_and_postedOn', (q) =>
        q.eq('ownerId', ownerId).eq('importBatchId', batch._id),
      )
      .take(MAX_SOURCE_TRANSACTIONS_PER_BATCH + 1);
    if (sourceTransactions.length > MAX_SOURCE_TRANSACTIONS_PER_BATCH) {
      throw new ConvexError({ code: 'IMPORT_BATCH_INCOMPLETE' });
    }

    const statementPayments = sourceTransactions.filter(
      (transaction) => transaction.transactionType === 'statementPayment',
    );

    return {
      ruleVersion: CARD_SETTLEMENT_RULE_VERSION,
      maximumDayDistance: CARD_SETTLEMENT_MAX_DAY_DISTANCE,
      statementPayments: await Promise.all(
        statementPayments.map(async (statementPayment) => {
          const existing = await ctx.db
            .query('cardSettlementReconciliations')
            .withIndex('by_ownerId_and_statementPaymentTransactionId', (q) =>
              q
                .eq('ownerId', ownerId)
                .eq('statementPaymentTransactionId', statementPayment._id),
            )
            .unique();

          if (existing) {
            const bankDebit = await requireReconciledBankDebit(ctx, ownerId, existing);
            return {
              transactionId: statementPayment._id,
              postedOn: statementPayment.postedOn,
              amount: statementPayment.amount,
              sourcePatrimony: statementPayment.sourcePatrimony ?? null,
              reconciliation: {
                reconciliationId: existing._id,
                bankDebit: toBankDebitResult(statementPayment, bankDebit),
                confirmedAt: existing.confirmedAt,
              },
              candidates: [],
            };
          }

          return {
            transactionId: statementPayment._id,
            postedOn: statementPayment.postedOn,
            amount: statementPayment.amount,
            sourcePatrimony: statementPayment.sourcePatrimony ?? null,
            reconciliation: null,
            candidates: await findAvailableCandidates(ctx, ownerId, statementPayment),
          };
        }),
      ),
    };
  },
});

export const confirm = mutation({
  args: {
    statementPaymentTransactionId: v.id('sourceTransactions'),
    bankDebitTransactionId: v.id('sourceTransactions'),
  },
  returns: v.object({
    reconciliationId: v.id('cardSettlementReconciliations'),
    status: v.literal('confirmed'),
  }),
  handler: async (ctx, args) => {
    const { ownerId } = await requireAuthorizedOwner(ctx);
    const [statementPayment, bankDebit] = await Promise.all([
      ctx.db.get('sourceTransactions', args.statementPaymentTransactionId),
      ctx.db.get('sourceTransactions', args.bankDebitTransactionId),
    ]);

    if (
      !statementPayment ||
      !bankDebit ||
      statementPayment.ownerId !== ownerId ||
      bankDebit.ownerId !== ownerId ||
      !bankDebit.sourcePatrimony ||
      !isCardSettlementCandidate(
        toRuleTransaction(statementPayment),
        toRuleTransaction(bankDebit),
      )
    ) {
      throw new ConvexError({ code: 'CARD_SETTLEMENT_CANDIDATE_INVALID' });
    }

    const existingForPayment = await ctx.db
      .query('cardSettlementReconciliations')
      .withIndex('by_ownerId_and_statementPaymentTransactionId', (q) =>
        q
          .eq('ownerId', ownerId)
          .eq('statementPaymentTransactionId', statementPayment._id),
      )
      .unique();
    if (existingForPayment) {
      if (existingForPayment.bankDebitTransactionId === bankDebit._id) {
        return { reconciliationId: existingForPayment._id, status: 'confirmed' as const };
      }
      throw new ConvexError({ code: 'CARD_SETTLEMENT_ALREADY_RECONCILED' });
    }

    const existingForDebit = await ctx.db
      .query('cardSettlementReconciliations')
      .withIndex('by_ownerId_and_bankDebitTransactionId', (q) =>
        q.eq('ownerId', ownerId).eq('bankDebitTransactionId', bankDebit._id),
      )
      .unique();
    if (existingForDebit) {
      throw new ConvexError({ code: 'CARD_SETTLEMENT_DEBIT_ALREADY_USED' });
    }

    const now = Date.now();
    const reconciliationId = await ctx.db.insert('cardSettlementReconciliations', {
      ownerId,
      statementPaymentTransactionId: statementPayment._id,
      bankDebitTransactionId: bankDebit._id,
      ruleVersion: CARD_SETTLEMENT_RULE_VERSION,
      dayDistance: getCardSettlementDayDistance(
        statementPayment.postedOn,
        bankDebit.postedOn,
      ),
      confirmedAt: now,
    });
    await appendAuditEvent(
      ctx,
      ownerId,
      {
        action: 'card_settlement.reconciled',
        targetType: 'card_settlement_reconciliation',
        targetId: reconciliationId,
      },
      now,
    );

    return { reconciliationId, status: 'confirmed' as const };
  },
});

async function findAvailableCandidates(
  ctx: QueryCtx,
  ownerId: string,
  statementPayment: Doc<'sourceTransactions'>,
) {
  const windowTransactions = await ctx.db
    .query('sourceTransactions')
    .withIndex('by_ownerId_and_postedOn', (q) =>
      q
        .eq('ownerId', ownerId)
        .gte(
          'postedOn',
          shiftIsoDate(statementPayment.postedOn, -CARD_SETTLEMENT_MAX_DAY_DISTANCE),
        )
        .lte(
          'postedOn',
          shiftIsoDate(statementPayment.postedOn, CARD_SETTLEMENT_MAX_DAY_DISTANCE),
        ),
    )
    .take(MAX_WINDOW_TRANSACTIONS + 1);
  if (windowTransactions.length > MAX_WINDOW_TRANSACTIONS) {
    throw new ConvexError({ code: 'CARD_SETTLEMENT_WINDOW_TOO_LARGE' });
  }

  const exactCandidates = windowTransactions.filter(
    (candidate) =>
      candidate._id !== statementPayment._id &&
      candidate.sourcePatrimony !== undefined &&
      isCardSettlementCandidate(
        toRuleTransaction(statementPayment),
        toRuleTransaction(candidate),
      ),
  );
  const available = [];
  for (const candidate of exactCandidates) {
    const existing = await ctx.db
      .query('cardSettlementReconciliations')
      .withIndex('by_ownerId_and_bankDebitTransactionId', (q) =>
        q.eq('ownerId', ownerId).eq('bankDebitTransactionId', candidate._id),
      )
      .unique();
    if (!existing) {
      available.push(toBankDebitResult(statementPayment, candidate));
    }
  }

  return available.sort(
    (left, right) =>
      left.dayDistance - right.dayDistance || left.postedOn.localeCompare(right.postedOn),
  );
}

async function requireReconciledBankDebit(
  ctx: QueryCtx,
  ownerId: string,
  reconciliation: Doc<'cardSettlementReconciliations'>,
): Promise<Doc<'sourceTransactions'>> {
  const bankDebit = await ctx.db.get(
    'sourceTransactions',
    reconciliation.bankDebitTransactionId,
  );
  if (!bankDebit || bankDebit.ownerId !== ownerId || !bankDebit.sourcePatrimony) {
    throw new ConvexError({ code: 'CARD_SETTLEMENT_RECONCILIATION_INVALID' });
  }
  return bankDebit;
}

function toRuleTransaction(transaction: Doc<'sourceTransactions'>) {
  return {
    postedOn: transaction.postedOn,
    amountInMinorUnits: transaction.amount.amountInMinorUnits,
    transactionType: transaction.transactionType,
    sourceAccountKind: transaction.sourceAccountKind ?? null,
  };
}

function toBankDebitResult(
  statementPayment: Doc<'sourceTransactions'>,
  bankDebit: Doc<'sourceTransactions'>,
) {
  if (!bankDebit.sourcePatrimony) {
    throw new ConvexError({ code: 'IMPORT_SOURCE_PATRIMONY_REQUIRED' });
  }

  return {
    transactionId: bankDebit._id,
    postedOn: bankDebit.postedOn,
    amount: bankDebit.amount,
    sourcePatrimony: bankDebit.sourcePatrimony,
    dayDistance: getCardSettlementDayDistance(
      statementPayment.postedOn,
      bankDebit.postedOn,
    ),
  };
}
