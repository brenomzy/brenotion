import { useMutation, useQuery } from 'convex/react';
import { useCallback, useMemo, useRef, useState } from 'react';

import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import {
  type FinancialCycleFormValues,
  type ReportedExpenseFormValidation,
} from './reported-expenses-presentation-model';
import type { ReportedExpensesScreenSource } from './reported-expenses-screen';

type ValidExpenseDetails = Extract<
  ReportedExpenseFormValidation,
  { status: 'valid' }
>['value'];

export function useReportedExpensesSource(): ReportedExpensesScreenSource {
  const cycle = useQuery(api.financialCycles.getCurrent);
  const expenses = useQuery(api.reportedExpenses.listForCurrentCycle);
  const [candidateExpenseId, setCandidateExpenseId] =
    useState<Id<'reportedExpenses'> | null>(null);
  const candidateResult = useQuery(
    api.reportedExpenses.listReconciliationCandidates,
    candidateExpenseId ? { reportedExpenseId: candidateExpenseId } : 'skip',
  );
  const openCycleMutation = useMutation(api.financialCycles.open);
  const createExpenseMutation = useMutation(api.reportedExpenses.create);
  const updateExpenseMutation = useMutation(
    api.reportedExpenses.updateDetails,
  );
  const voidExpenseMutation = useMutation(api.reportedExpenses.voidExpense);
  const reconcileMutation = useMutation(
    api.reportedExpenses.confirmReconciliation,
  );
  const requestIds = useRef(new Map<string, string>());

  const requestIdFor = useCallback((operationKey: string): string => {
    const existing = requestIds.current.get(operationKey);
    if (existing) {
      return existing;
    }

    const requestId = createClientRequestId();
    requestIds.current.set(operationKey, requestId);
    return requestId;
  }, []);

  const openCycle = useCallback(
    async (values: FinancialCycleFormValues) => {
      const operationKey = `cycle:${values.startedOn}:${values.expectedNextReceiptOn}`;
      await openCycleMutation({
        ...values,
        timeZone: 'America/Sao_Paulo',
        clientRequestId: requestIdFor(operationKey),
      });
      requestIds.current.delete(operationKey);
    },
    [openCycleMutation, requestIdFor],
  );

  const createExpense = useCallback(
    async (values: ValidExpenseDetails) => {
      const operationKey = [
        'expense',
        values.amount.amountInMinorUnits.toString(),
        values.description,
        values.occurredOn,
        values.economicNature,
        values.sourcePatrimony,
      ].join(':');
      await createExpenseMutation({
        ...values,
        clientRequestId: requestIdFor(operationKey),
      });
      requestIds.current.delete(operationKey);
    },
    [createExpenseMutation, requestIdFor],
  );

  const updateExpense = useCallback(
    async (expenseId: string, values: ValidExpenseDetails) => {
      await updateExpenseMutation({
        reportedExpenseId: expenseId as Id<'reportedExpenses'>,
        ...values,
      });
    },
    [updateExpenseMutation],
  );

  const voidExpense = useCallback(
    async (expenseId: string) => {
      await voidExpenseMutation({
        reportedExpenseId: expenseId as Id<'reportedExpenses'>,
      });
    },
    [voidExpenseMutation],
  );

  const confirmReconciliation = useCallback(
    async (expenseId: string, sourceTransactionId: string) => {
      await reconcileMutation({
        reportedExpenseId: expenseId as Id<'reportedExpenses'>,
        sourceTransactionId:
          sourceTransactionId as Id<'sourceTransactions'>,
      });
      setCandidateExpenseId(null);
    },
    [reconcileMutation],
  );

  const candidates = useMemo(
    () =>
      (candidateResult?.candidates ?? []).map((candidate) => ({
        sourceTransactionId: candidate.sourceTransactionId,
        postedOn: candidate.postedOn,
        description: candidate.description,
        amount: candidate.amount,
        explanation: explainCandidate(
          candidate.dayDistance,
          candidate.sourcePatrimony,
          candidateResult?.maximumDayDistance ?? 7,
        ),
      })),
    [candidateResult],
  );

  return {
    status:
      cycle === undefined || expenses === undefined
        ? ('loading' as const)
        : ('ready' as const),
    cycle: cycle
      ? {
          financialCycleId: cycle.financialCycleId,
          startedOn: cycle.startedOn,
          expectedNextReceiptOn: cycle.expectedNextReceiptOn,
          status: cycle.status,
        }
      : null,
    expenses: expenses?.items ?? [],
    isTruncated: expenses?.isTruncated ?? false,
    reconciliation: {
      expenseId: candidateExpenseId,
      status: !candidateExpenseId
        ? 'idle'
        : candidateResult === undefined
          ? 'loading'
          : 'ready',
      candidates,
    },
    openCycle,
    createExpense,
    updateExpense,
    voidExpense,
    requestCandidates: (expenseId) =>
      setCandidateExpenseId(expenseId as Id<'reportedExpenses'>),
    confirmReconciliation,
  };
}

function explainCandidate(
  dayDistance: number,
  sourcePatrimony: 'personal' | 'business',
  maximumDayDistance: number,
): string {
  const distanceLabel =
    dayDistance === 0
      ? 'na mesma data'
      : dayDistance === 1
        ? 'a 1 dia do registro'
        : `a ${dayDistance} dias do registro`;
  const patrimonyLabel =
    sourcePatrimony === 'personal' ? 'Pessoal' : 'Empresa';

  return `Valor oposto exato, ${distanceLabel}, dentro da janela de ${maximumDayDistance} dias. Patrimônio de Origem: ${patrimonyLabel}.`;
}

function createClientRequestId(): string {
  const timestamp = Date.now().toString(36);
  const entropy = Math.floor(Math.random() * 36 ** 8)
    .toString(36)
    .padStart(8, '0');
  return `client:${timestamp}:${entropy}`;
}
