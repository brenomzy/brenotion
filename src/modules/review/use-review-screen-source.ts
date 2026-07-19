import { usePaginatedQuery } from 'convex/react';
import { useCallback, useMemo, useState } from 'react';

import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import {
  type ReviewImportBatch,
  type ReviewScreenModel,
  type ReviewSourceTransaction,
} from './review-screen-model';

const INITIAL_BATCH_COUNT = 6;
const MORE_BATCH_COUNT = 6;
const INITIAL_TRANSACTION_COUNT = 20;
const MORE_TRANSACTION_COUNT = 20;

export function useReviewScreenSource() {
  const [requestedBatchId, setRequestedBatchId] = useState<Id<'importBatches'> | null>(null);
  const batchesQuery = usePaginatedQuery(
    api.importHistory.listConfirmedBatches,
    {},
    { initialNumItems: INITIAL_BATCH_COUNT },
  );
  const selectedBatchId =
    requestedBatchId &&
    batchesQuery.results.some((batch) => batch.batchId === requestedBatchId)
      ? requestedBatchId
      : (batchesQuery.results[0]?.batchId ?? null);
  const transactionsQuery = usePaginatedQuery(
    api.importHistory.listSourceTransactions,
    selectedBatchId ? { batchId: selectedBatchId } : 'skip',
    { initialNumItems: INITIAL_TRANSACTION_COUNT },
  );

  const selectBatch = useCallback(
    (batchId: string) => {
      const selected = batchesQuery.results.find((batch) => batch.batchId === batchId);

      if (selected) {
        setRequestedBatchId(selected.batchId);
      }
    },
    [batchesQuery.results],
  );

  const loadMoreBatches = useCallback(() => {
    if (batchesQuery.status === 'CanLoadMore') {
      batchesQuery.loadMore(MORE_BATCH_COUNT);
    }
  }, [batchesQuery]);

  const loadMoreTransactions = useCallback(() => {
    if (transactionsQuery.status === 'CanLoadMore') {
      transactionsQuery.loadMore(MORE_TRANSACTION_COUNT);
    }
  }, [transactionsQuery]);

  const model = useMemo<ReviewScreenModel>(() => {
    if (batchesQuery.status === 'LoadingFirstPage') {
      return { status: 'loading', origin: { kind: 'persisted' } };
    }

    if (batchesQuery.results.length === 0) {
      return {
        status: 'empty',
        origin: { kind: 'persisted' },
        title: 'Importe seu primeiro período',
        description:
          'Nenhum Lote de Importação confirmado foi encontrado. Envie um arquivo OFX ou XLSX pelo companion web para começar.',
      };
    }

    if (!selectedBatchId) {
      return { status: 'loading', origin: { kind: 'persisted' } };
    }

    return {
      status: 'ready',
      origin: { kind: 'persisted' },
      selectedBatchId,
      batches: batchesQuery.results.map(toReviewBatch),
      hasMoreBatches: batchesQuery.status === 'CanLoadMore',
      isLoadingMoreBatches: batchesQuery.status === 'LoadingMore',
      transactions: transactionsQuery.results.map(toReviewTransaction),
      isLoadingTransactions: transactionsQuery.status === 'LoadingFirstPage',
      hasMoreTransactions: transactionsQuery.status === 'CanLoadMore',
      isLoadingMoreTransactions: transactionsQuery.status === 'LoadingMore',
    };
  }, [
    batchesQuery.results,
    batchesQuery.status,
    selectedBatchId,
    transactionsQuery.results,
    transactionsQuery.status,
  ]);

  return {
    model,
    selectBatch,
    loadMoreBatches,
    loadMoreTransactions,
  };
}

function toReviewBatch(
  batch: (typeof api.importHistory.listConfirmedBatches)['_returnType']['page'][number],
): ReviewImportBatch {
  return {
    id: batch.batchId,
    format: batch.format,
    sourceAccountKind: batch.sourceAccountKind,
    parserVersion: batch.parserVersion,
    periodStart: batch.periodStart,
    periodEnd: batch.periodEnd,
    statementTitle: batch.statementTitle,
    statementCompetence: batch.statementCompetence,
    statementDueOn: batch.statementDueOn,
    statementTotal: batch.statementTotal,
    purchaseTotal: batch.purchaseTotal,
    creditAdjustmentTotal: batch.creditAdjustmentTotal,
    settlementTotal: batch.settlementTotal,
    transactionCount: batch.transactionCount,
    duplicateCount: batch.duplicateCount,
    insertedCount: batch.insertedCount,
    creditTotal: batch.creditTotal,
    debitTotal: batch.debitTotal,
    confirmedAt: batch.confirmedAt,
  };
}

function toReviewTransaction(
  transaction: (typeof api.importHistory.listSourceTransactions)['_returnType']['page'][number],
): ReviewSourceTransaction {
  return {
    id: transaction.transactionId,
    importBatchId: transaction.importBatchId,
    postedOn: transaction.postedOn,
    amount: transaction.amount,
    description: transaction.description,
    transactionType: transaction.transactionType,
    sourceAccountKind: transaction.sourceAccountKind,
    installmentCurrent: transaction.installmentCurrent,
    installmentTotal: transaction.installmentTotal,
  };
}
