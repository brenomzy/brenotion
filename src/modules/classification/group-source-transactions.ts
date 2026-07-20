import { normalizeTransactionDescription } from './transaction-description-normalizer';

export type SourceCollectionCompleteness = 'complete' | 'partial';

export type SourceTransactionForGrouping = Readonly<{
  id: string;
  description: string;
  transactionType: string;
  sourceKind?: string;
  postedOn: string;
  amountInMinorUnits: bigint;
}>;

export type SourceTransactionGroup = Readonly<{
  groupKey: string;
  representativeDescription: string;
  normalizedDescription: string;
  count: number;
  transactionIds: readonly string[];
  firstPostedOn: string;
  lastPostedOn: string;
  creditTotalInMinorUnits: bigint;
  debitTotalInMinorUnits: bigint;
  sourceCollectionCompleteness: SourceCollectionCompleteness;
}>;

export type GroupSourceTransactionsInput = Readonly<{
  transactions: readonly SourceTransactionForGrouping[];
  sourceCollectionCompleteness: SourceCollectionCompleteness;
}>;

export type GroupedSourceTransactions = Readonly<{
  sourceCollectionCompleteness: SourceCollectionCompleteness;
  groups: readonly SourceTransactionGroup[];
}>;

type MutableSourceTransactionGroup = {
  groupKey: string;
  representativeDescription: string;
  normalizedDescription: string;
  count: number;
  transactionIds: string[];
  firstPostedOn: string;
  lastPostedOn: string;
  creditTotalInMinorUnits: bigint;
  debitTotalInMinorUnits: bigint;
};

export function groupSourceTransactions(
  input: GroupSourceTransactionsInput,
): GroupedSourceTransactions {
  const sortedTransactions = [...input.transactions].sort(compareTransactions);
  const groupsByKey = new Map<string, MutableSourceTransactionGroup>();

  for (const transaction of sortedTransactions) {
    const normalized = normalizeTransactionDescription({
      description: transaction.description,
      metadata: {
        transactionType: transaction.transactionType,
        sourceKind: transaction.sourceKind,
      },
    });
    const existing = groupsByKey.get(normalized.groupKey);

    if (existing) {
      existing.count += 1;
      existing.transactionIds.push(transaction.id);
      existing.firstPostedOn = earlierDate(existing.firstPostedOn, transaction.postedOn);
      existing.lastPostedOn = laterDate(existing.lastPostedOn, transaction.postedOn);
      addAmount(existing, transaction.amountInMinorUnits);
      continue;
    }

    const group: MutableSourceTransactionGroup = {
      groupKey: normalized.groupKey,
      representativeDescription: normalized.originalDescription,
      normalizedDescription: normalized.normalizedDescription,
      count: 1,
      transactionIds: [transaction.id],
      firstPostedOn: transaction.postedOn,
      lastPostedOn: transaction.postedOn,
      creditTotalInMinorUnits: 0n,
      debitTotalInMinorUnits: 0n,
    };

    addAmount(group, transaction.amountInMinorUnits);
    groupsByKey.set(group.groupKey, group);
  }

  const groups = Array.from(groupsByKey.values())
    .sort(compareGroups)
    .map((group) => ({
      ...group,
      sourceCollectionCompleteness: input.sourceCollectionCompleteness,
    }));

  return {
    sourceCollectionCompleteness: input.sourceCollectionCompleteness,
    groups,
  };
}

function addAmount(group: MutableSourceTransactionGroup, amountInMinorUnits: bigint): void {
  if (amountInMinorUnits > 0n) {
    group.creditTotalInMinorUnits += amountInMinorUnits;
    return;
  }

  if (amountInMinorUnits < 0n) {
    group.debitTotalInMinorUnits += -amountInMinorUnits;
  }
}

function compareTransactions(
  left: SourceTransactionForGrouping,
  right: SourceTransactionForGrouping,
): number {
  const byPostedOnDescending = compareText(right.postedOn, left.postedOn);

  if (byPostedOnDescending !== 0) {
    return byPostedOnDescending;
  }

  return compareText(left.id, right.id);
}

function compareGroups(
  left: MutableSourceTransactionGroup,
  right: MutableSourceTransactionGroup,
): number {
  const byLastPostedOnDescending = compareText(right.lastPostedOn, left.lastPostedOn);

  if (byLastPostedOnDescending !== 0) {
    return byLastPostedOnDescending;
  }

  return compareText(left.groupKey, right.groupKey);
}

function compareText(left: string, right: string): number {
  if (left < right) {
    return -1;
  }

  if (left > right) {
    return 1;
  }

  return 0;
}

function earlierDate(left: string, right: string): string {
  return left < right ? left : right;
}

function laterDate(left: string, right: string): string {
  return left > right ? left : right;
}
