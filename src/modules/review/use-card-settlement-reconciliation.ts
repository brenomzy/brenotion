import { useMutation, useQuery } from 'convex/react';
import { useCallback, useState } from 'react';

import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import type { ReviewImportBatch } from './review-screen-model';

export function useCardSettlementReconciliation(batch: ReviewImportBatch) {
  const result = useQuery(
    api.cardSettlements.listForStatementBatch,
    batch.format === 'itauCreditCardXlsx'
      ? { batchId: batch.id as Id<'importBatches'> }
      : 'skip',
  );
  const confirmMutation = useMutation(api.cardSettlements.confirm);
  const [savingCandidateId, setSavingCandidateId] = useState<string | null>(null);
  const [errorCandidateId, setErrorCandidateId] = useState<string | null>(null);

  const confirm = useCallback(
    async (statementPaymentTransactionId: string, bankDebitTransactionId: string) => {
      setSavingCandidateId(bankDebitTransactionId);
      setErrorCandidateId(null);
      try {
        await confirmMutation({
          statementPaymentTransactionId:
            statementPaymentTransactionId as Id<'sourceTransactions'>,
          bankDebitTransactionId: bankDebitTransactionId as Id<'sourceTransactions'>,
        });
      } catch {
        setErrorCandidateId(bankDebitTransactionId);
      } finally {
        setSavingCandidateId(null);
      }
    },
    [confirmMutation],
  );

  return {
    status: result === undefined ? ('loading' as const) : ('ready' as const),
    result: result ?? null,
    savingCandidateId,
    errorCandidateId,
    confirm,
  };
}
