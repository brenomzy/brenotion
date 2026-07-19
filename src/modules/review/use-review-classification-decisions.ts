import { useMutation, useQueries, type RequestForQueries } from 'convex/react';
import { useCallback, useMemo, useState } from 'react';

import {
  groupSourceTransactions,
  type SourceTransactionGroup,
} from '@/modules/classification/group-source-transactions';
import { api } from '../../../convex/_generated/api';
import {
  chunkClassificationGroupKeys,
  collectClassificationQueryResults,
  reconcileRecentlySavedDecisions,
  resolveEconomicNature,
  selectTransactionsForEconomicNature,
  type EconomicNature,
  type RecentlySavedClassificationDecision,
} from './review-classification-model';
import { type ReviewSourceTransaction } from './review-screen-model';

const MAX_GROUP_KEYS_PER_QUERY = 100;

type ClassificationSaveStatus = 'saving' | 'error';

export type ReviewClassificationGroup = SourceTransactionGroup &
  Readonly<{
    economicNature: EconomicNature | null;
    saveStatus: ClassificationSaveStatus | null;
  }>;

export function useReviewClassificationDecisions(input: {
  transactions: readonly ReviewSourceTransaction[];
  isLoadingTransactions: boolean;
  hasMoreTransactions: boolean;
}) {
  const groups = useMemo(
    () =>
      groupSourceTransactions({
        transactions: selectTransactionsForEconomicNature(input.transactions).map(
          (transaction) => ({
            id: transaction.id,
            description: transaction.description,
            transactionType: transaction.transactionType,
            sourceKind: transaction.sourceAccountKind,
            postedOn: transaction.postedOn,
            amountInMinorUnits: transaction.amount.amountInMinorUnits,
          }),
        ),
        sourceCollectionCompleteness:
          input.isLoadingTransactions || input.hasMoreTransactions ? 'partial' : 'complete',
      }).groups,
    [input.hasMoreTransactions, input.isLoadingTransactions, input.transactions],
  );
  const queryBatches = useMemo(
    () =>
      chunkClassificationGroupKeys(
        groups.map((group) => group.groupKey),
        MAX_GROUP_KEYS_PER_QUERY,
      ),
    [groups],
  );
  const queryRequests = useMemo<RequestForQueries>(
    () =>
      Object.fromEntries(
        queryBatches.map((groupKeys, index) => [
          `classification-batch-${index}`,
          {
            query: api.classificationDecisions.listByGroupKeys,
            args: { groupKeys: [...groupKeys] },
          },
        ]),
      ),
    [queryBatches],
  );
  const queryResults = useQueries(queryRequests);
  const queryState = useMemo(
    () => collectClassificationQueryResults(queryResults),
    [queryResults],
  );
  const persistDecision = useMutation(api.classificationDecisions.upsert);
  const [recentlySavedDecisions, setRecentlySavedDecisions] = useState<
    Readonly<Record<string, RecentlySavedClassificationDecision>>
  >({});
  const [saveStatuses, setSaveStatuses] = useState<
    Record<string, ClassificationSaveStatus>
  >({});

  const setEconomicNature = useCallback(
    async (groupKey: string, economicNature: EconomicNature) => {
      const group = groups.find((candidate) => candidate.groupKey === groupKey);

      if (!group) {
        return;
      }

      setSaveStatuses((current) => ({
        ...current,
        [groupKey]: 'saving',
      }));

      try {
        const result = await persistDecision({
          groupKey: group.groupKey,
          normalizedDescription: group.normalizedDescription,
          economicNature,
        });
        setRecentlySavedDecisions((current) => ({
          ...current,
          [groupKey]: {
            economicNature,
            updatedAt: result.decision.updatedAt,
          },
        }));
        setSaveStatuses((current) => omitKey(current, groupKey));
      } catch {
        setSaveStatuses((current) => ({
          ...current,
          [groupKey]: 'error',
        }));
      }
    },
    [groups, persistDecision],
  );

  const activeRecentlySavedDecisions = useMemo(
    () =>
      reconcileRecentlySavedDecisions(
        queryState.decisionsByGroupKey,
        recentlySavedDecisions,
      ),
    [queryState.decisionsByGroupKey, recentlySavedDecisions],
  );
  const classificationGroups = useMemo<readonly ReviewClassificationGroup[]>(
    () =>
      groups.map((group) => ({
        ...group,
        economicNature: resolveEconomicNature(
          group.groupKey,
          queryState.decisionsByGroupKey,
          activeRecentlySavedDecisions,
        ),
        saveStatus: saveStatuses[group.groupKey] ?? null,
      })),
    [
      activeRecentlySavedDecisions,
      groups,
      queryState.decisionsByGroupKey,
      saveStatuses,
    ],
  );

  return {
    status:
      input.isLoadingTransactions && classificationGroups.length === 0
        ? ('loading' as const)
        : queryState.status,
    groups: classificationGroups,
    isComplete: !input.isLoadingTransactions && !input.hasMoreTransactions,
    setEconomicNature,
  };
}

function omitKey<T>(record: Readonly<Record<string, T>>, key: string): Record<string, T> {
  const next = { ...record };
  delete next[key];
  return next;
}
