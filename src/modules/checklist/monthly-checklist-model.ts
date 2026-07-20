import type {
  ObligationOccurrenceListItem,
  ObligationOccurrenceStatus,
} from '@/modules/obligations/obligation-occurrences-presentation-model';

export type MonthlyChecklistAction = 'complete' | 'waive' | 'reopen';

export type MonthlyChecklistProgress = Readonly<{
  total: number;
  resolved: number;
  remaining: number;
  percentage: number;
  label: string;
}>;

export function buildMonthlyChecklistProgress(
  items: readonly Pick<ObligationOccurrenceListItem, 'status'>[],
): MonthlyChecklistProgress {
  const resolved = items.filter((item) => isResolved(item.status)).length;
  const total = items.length;

  return {
    total,
    resolved,
    remaining: total - resolved,
    percentage: total === 0 ? 0 : Math.round((resolved / total) * 100),
    label:
      total === 0
        ? 'Nenhum item neste mês'
        : `${resolved} de ${total} ${total === 1 ? 'item resolvido' : 'itens resolvidos'}`,
  };
}

export function actionsForChecklistStatus(
  status: ObligationOccurrenceStatus,
): readonly MonthlyChecklistAction[] {
  return status === 'completed' || status === 'waived'
    ? ['reopen']
    : ['complete', 'waive'];
}

function isResolved(status: ObligationOccurrenceStatus): boolean {
  return status === 'completed' || status === 'waived';
}
