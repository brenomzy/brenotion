export type EconomicNature = 'personal' | 'business' | 'mixed';

export type ReviewClassificationDecision = Readonly<{
  groupKey: string;
  normalizedDescription: string;
  economicNature: EconomicNature;
}>;

export type ClassificationQueryResult = Readonly<{
  status: 'loading' | 'ready' | 'error';
  decisionsByGroupKey: ReadonlyMap<string, ReviewClassificationDecision>;
}>;

const ECONOMIC_NATURES = new Set<EconomicNature>(['personal', 'business', 'mixed']);

export function selectTransactionsForEconomicNature<
  Transaction extends Readonly<{ transactionType: string }>,
>(transactions: readonly Transaction[]): readonly Transaction[] {
  return transactions.filter(
    (transaction) => transaction.transactionType !== 'statementPayment',
  );
}

export function chunkClassificationGroupKeys(
  groupKeys: readonly string[],
  maximumBatchSize: number,
): readonly (readonly string[])[] {
  if (!Number.isInteger(maximumBatchSize) || maximumBatchSize <= 0) {
    throw new Error('Classification query batch size must be a positive integer.');
  }

  const batches: string[][] = [];

  for (let index = 0; index < groupKeys.length; index += maximumBatchSize) {
    batches.push(groupKeys.slice(index, index + maximumBatchSize));
  }

  return batches;
}

export function collectClassificationQueryResults(
  results: Readonly<Record<string, unknown>>,
): ClassificationQueryResult {
  const decisionsByGroupKey = new Map<string, ReviewClassificationDecision>();
  let isLoading = false;

  for (const result of Object.values(results)) {
    if (result === undefined) {
      isLoading = true;
      continue;
    }

    if (result instanceof Error || !Array.isArray(result)) {
      return {
        status: 'error',
        decisionsByGroupKey,
      };
    }

    for (const decision of result) {
      if (!isReviewClassificationDecision(decision)) {
        return {
          status: 'error',
          decisionsByGroupKey,
        };
      }

      decisionsByGroupKey.set(decision.groupKey, decision);
    }
  }

  return {
    status: isLoading ? 'loading' : 'ready',
    decisionsByGroupKey,
  };
}

export function resolveEconomicNature(
  groupKey: string,
  persistedDecisions: ReadonlyMap<string, ReviewClassificationDecision>,
  confirmedDecisions: Readonly<Record<string, EconomicNature>>,
): EconomicNature | null {
  return confirmedDecisions[groupKey] ?? persistedDecisions.get(groupKey)?.economicNature ?? null;
}

function isReviewClassificationDecision(
  value: unknown,
): value is ReviewClassificationDecision {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const decision = value as Record<string, unknown>;

  return (
    typeof decision.groupKey === 'string' &&
    typeof decision.normalizedDescription === 'string' &&
    typeof decision.economicNature === 'string' &&
    ECONOMIC_NATURES.has(decision.economicNature as EconomicNature)
  );
}
