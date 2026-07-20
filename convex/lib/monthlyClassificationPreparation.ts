import { ConvexError } from 'convex/values';

import {
  CLASSIFICATION_PROMPT_VERSION,
  CLASSIFICATION_SANITIZER_VERSION,
  CLASSIFICATION_SCHEMA_VERSION,
  CLASSIFICATION_TAXONOMY_VERSION,
  sanitizeClassificationDescription,
  type ClassificationCategoryId,
  type ManualReviewReason,
} from '../../shared/ai-classification';
import { creditCardStatementMatchesSpendingCompetence } from '../../shared/credit-card-competence';
import {
  normalizeTransactionDescription,
} from '../../shared/transaction-description-normalization';
import type { Doc, Id } from '../_generated/dataModel';
import type { MutationCtx, QueryCtx } from '../_generated/server';

type PreparationCtx = Pick<QueryCtx | MutationCtx, 'db'>;

export type PreparedClassificationGroup = Readonly<{
  groupId: string;
  groupKey: string;
  sanitizedDescription: string | null;
  manualReviewReason: ManualReviewReason | null;
  direction: 'debit' | 'credit' | 'mixed';
  sourcePatrimony: 'personal' | 'business' | 'mixed' | 'unknown';
  occurrenceCount: number;
  ruleCategoryId: ClassificationCategoryId | null;
}>;

export type MonthlyClassificationPreparation = Readonly<{
  competence: string;
  inputHash: string;
  groups: readonly PreparedClassificationGroup[];
  totalGroupCount: number;
  resolvedByRuleCount: number;
}>;

const MAX_CONFIRMED_BATCHES = 200;
const MAX_BANK_TRANSACTIONS = 1_000;
const MAX_CARD_TRANSACTIONS_PER_BATCH = 500;
const MAX_GROUPS = 300;

export async function buildMonthlyClassificationPreparation(
  ctx: PreparationCtx,
  ownerId: string,
  competence: string,
): Promise<MonthlyClassificationPreparation> {
  validateCompetence(competence);
  const confirmedBatches = await ctx.db
    .query('importBatches')
    .withIndex('by_ownerId_and_status_and_confirmedAt', (q) =>
      q.eq('ownerId', ownerId).eq('status', 'confirmed'),
    )
    .order('desc')
    .take(MAX_CONFIRMED_BATCHES + 1);

  if (confirmedBatches.length > MAX_CONFIRMED_BATCHES) {
    throw new ConvexError({ code: 'CLASSIFICATION_IMPORT_SEARCH_TRUNCATED' });
  }

  requireCompleteMonthlyCoverage(confirmedBatches, competence);

  const [monthStart, monthEnd] = competenceDateRange(competence);
  const bankTransactions = await ctx.db
    .query('sourceTransactions')
    .withIndex('by_ownerId_and_postedOn', (q) =>
      q
        .eq('ownerId', ownerId)
        .gte('postedOn', monthStart)
        .lte('postedOn', monthEnd),
    )
    .take(MAX_BANK_TRANSACTIONS + 1);

  if (bankTransactions.length > MAX_BANK_TRANSACTIONS) {
    throw new ConvexError({
      code: 'CLASSIFICATION_TRANSACTION_SEARCH_TRUNCATED',
    });
  }

  const cardBatchIds = confirmedBatches
    .filter(
      (batch) =>
        batch.format === 'itauCreditCardXlsx' &&
        creditCardStatementMatchesSpendingCompetence(
          batch.statementCompetence,
          competence,
        ),
    )
    .map((batch) => batch._id);
  const cardTransactions: Doc<'sourceTransactions'>[] = [];

  for (const batchId of cardBatchIds) {
    const transactions = await ctx.db
      .query('sourceTransactions')
      .withIndex('by_ownerId_and_importBatchId_and_postedOn', (q) =>
        q.eq('ownerId', ownerId).eq('importBatchId', batchId),
      )
      .take(MAX_CARD_TRANSACTIONS_PER_BATCH + 1);

    if (transactions.length > MAX_CARD_TRANSACTIONS_PER_BATCH) {
      throw new ConvexError({
        code: 'CLASSIFICATION_TRANSACTION_SEARCH_TRUNCATED',
      });
    }
    cardTransactions.push(...transactions);
  }

  const reconciliations = await ctx.db
    .query('cardSettlementReconciliations')
    .withIndex('by_ownerId_and_bankDebitTransactionId', (q) =>
      q.eq('ownerId', ownerId),
    )
    .take(MAX_BANK_TRANSACTIONS + 1);

  if (reconciliations.length > MAX_BANK_TRANSACTIONS) {
    throw new ConvexError({
      code: 'CLASSIFICATION_RECONCILIATION_SEARCH_TRUNCATED',
    });
  }

  const excludedBankDebitIds = new Set(
    reconciliations.map((reconciliation) =>
      String(reconciliation.bankDebitTransactionId),
    ),
  );
  const transactionsById = new Map<
    Id<'sourceTransactions'>,
    Doc<'sourceTransactions'>
  >();

  for (const transaction of [...bankTransactions, ...cardTransactions]) {
    if (
      transaction.transactionType === 'statementPayment' ||
      excludedBankDebitIds.has(String(transaction._id)) ||
      (transaction.sourceAccountKind === 'bankAccount' &&
        transaction.sourcePatrimony !== 'personal' &&
        transaction.sourcePatrimony !== 'business')
    ) {
      continue;
    }
    transactionsById.set(transaction._id, transaction);
  }

  const grouped = groupTransactions([...transactionsById.values()]);

  if (grouped.length > MAX_GROUPS) {
    throw new ConvexError({ code: 'TOO_MANY_CLASSIFICATION_GROUPS' });
  }

  const groups: PreparedClassificationGroup[] = [];
  const fingerprintGroups: Readonly<Record<string, unknown>>[] = [];
  let resolvedByRuleCount = 0;

  for (const group of grouped) {
    const groupId = await opaqueGroupId(group.groupKey);
    const rule = await ctx.db
      .query('classificationRules')
      .withIndex('by_ownerId_and_groupKey', (q) =>
        q.eq('ownerId', ownerId).eq('groupKey', groupId),
      )
      .unique();
    const sanitized = sanitizeClassificationDescription(
      group.normalizedDescription,
    );
    const ruleCategoryId = rule?.categoryId ?? null;

    if (ruleCategoryId) {
      resolvedByRuleCount += 1;
    }

    groups.push({
      groupId,
      groupKey: groupId,
      sanitizedDescription:
        sanitized.kind === 'safe' ? sanitized.text : null,
      manualReviewReason:
        sanitized.kind === 'manual_review' ? sanitized.reason : null,
      direction: group.direction,
      sourcePatrimony: group.sourcePatrimony,
      occurrenceCount: group.occurrenceCount,
      ruleCategoryId,
    });
    fingerprintGroups.push({
      groupId,
      ruleCategoryId,
      ruleUpdatedAt: rule?.updatedAt ?? null,
      sanitizerResult:
        sanitized.kind === 'safe' ? 'safe' : sanitized.reason,
    });
  }

  const inputHash = await createFingerprint({
    competence,
    groups: fingerprintGroups,
    promptVersion: CLASSIFICATION_PROMPT_VERSION,
    schemaVersion: CLASSIFICATION_SCHEMA_VERSION,
    taxonomyVersion: CLASSIFICATION_TAXONOMY_VERSION,
    sanitizerVersion: CLASSIFICATION_SANITIZER_VERSION,
  });

  return {
    competence,
    inputHash,
    groups,
    totalGroupCount: groups.length,
    resolvedByRuleCount,
  };
}

type MutableGroup = {
  groupKey: string;
  normalizedDescription: string;
  transactionIds: Id<'sourceTransactions'>[];
  debitCount: number;
  creditCount: number;
  patrimonies: Set<'personal' | 'business'>;
};

function groupTransactions(
  transactions: readonly Doc<'sourceTransactions'>[],
): readonly Readonly<{
  groupKey: string;
  normalizedDescription: string;
  direction: 'debit' | 'credit' | 'mixed';
  sourcePatrimony: 'personal' | 'business' | 'mixed' | 'unknown';
  occurrenceCount: number;
}>[] {
  const groups = new Map<string, MutableGroup>();

  for (const transaction of transactions) {
    const normalized = normalizeTransactionDescription({
      description: transaction.description,
      metadata: {
        transactionType: transaction.transactionType,
        sourceKind: transaction.sourceAccountKind,
      },
    });
    const current = groups.get(normalized.groupKey) ?? {
      groupKey: normalized.groupKey,
      normalizedDescription: normalized.normalizedDescription,
      transactionIds: [],
      debitCount: 0,
      creditCount: 0,
      patrimonies: new Set<'personal' | 'business'>(),
    };

    current.transactionIds.push(transaction._id);
    if (transaction.amount.amountInMinorUnits < 0n) current.debitCount += 1;
    if (transaction.amount.amountInMinorUnits > 0n) current.creditCount += 1;
    if (
      transaction.sourcePatrimony === 'personal' ||
      transaction.sourcePatrimony === 'business'
    ) {
      current.patrimonies.add(transaction.sourcePatrimony);
    }
    groups.set(normalized.groupKey, current);
  }

  return [...groups.values()]
    .sort((left, right) => left.groupKey.localeCompare(right.groupKey))
    .map((group) => ({
      groupKey: group.groupKey,
      normalizedDescription: group.normalizedDescription,
      direction:
        group.debitCount > 0 && group.creditCount > 0
          ? ('mixed' as const)
          : group.creditCount > 0
            ? ('credit' as const)
            : ('debit' as const),
      sourcePatrimony:
        group.patrimonies.size > 1
          ? ('mixed' as const)
          : (group.patrimonies.values().next().value ?? 'unknown'),
      occurrenceCount: group.transactionIds.length,
    }));
}

function requireCompleteMonthlyCoverage(
  batches: readonly Doc<'importBatches'>[],
  competence: string,
): void {
  const hasPersonalBank = batches.some(
    (batch) =>
      batch.format === 'ofx' &&
      batch.sourcePatrimony === 'personal' &&
      batchMatchesCompetence(batch, competence),
  );
  const hasBusinessBank = batches.some(
    (batch) =>
      batch.format === 'ofx' &&
      batch.sourcePatrimony === 'business' &&
      batchMatchesCompetence(batch, competence),
  );
  const hasCreditCard = batches.some(
    (batch) =>
      batch.format === 'itauCreditCardXlsx' &&
      batch.sourcePatrimony === 'personal' &&
      creditCardStatementMatchesSpendingCompetence(
        batch.statementCompetence,
        competence,
      ),
  );

  if (!hasPersonalBank || !hasBusinessBank || !hasCreditCard) {
    throw new ConvexError({ code: 'MONTHLY_SOURCES_INCOMPLETE' });
  }
}

function batchMatchesCompetence(
  batch: Doc<'importBatches'>,
  competence: string,
): boolean {
  if (!batch.periodStart || !batch.periodEnd) {
    return false;
  }

  const [monthStart, monthEnd] = competenceDateRange(competence);
  return batch.periodStart <= monthEnd && batch.periodEnd >= monthStart;
}

function competenceDateRange(competence: string): readonly [string, string] {
  const [yearText, monthText] = competence.split('-');
  const lastDay = new Date(
    Date.UTC(Number(yearText), Number(monthText), 0),
  ).getUTCDate();
  return [
    `${competence}-01`,
    `${competence}-${String(lastDay).padStart(2, '0')}`,
  ];
}

function validateCompetence(value: string): void {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
    throw new ConvexError({ code: 'INVALID_COMPETENCE' });
  }
}

async function opaqueGroupId(groupKey: string): Promise<string> {
  return `group_${(await sha256(groupKey)).slice(0, 24)}`;
}

async function createFingerprint(value: unknown): Promise<string> {
  return await sha256(JSON.stringify(value));
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}
