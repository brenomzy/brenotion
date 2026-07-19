import type { Id } from '../../../convex/_generated/dataModel';
import {
  formatObligationEconomicNature,
  formatObligationExpectedAmount,
  formatObligationPaymentOrigin,
  type ObligationEconomicNature,
  type ObligationMoney,
  type ObligationPaymentOrigin,
} from './obligations-presentation-model';

export type ObligationOccurrenceStatus =
  | 'pending'
  | 'completed'
  | 'waived'
  | 'needsAttention';

export type ObligationOccurrenceWaiverReason =
  | 'notDueThisCompetence'
  | 'cancelledForCompetence'
  | 'duplicateOccurrence';

export type ObligationOccurrence = Readonly<{
  occurrenceId: Id<'obligationOccurrences'>;
  obligationId: Id<'obligations'>;
  competence: string;
  name: string;
  economicNature: ObligationEconomicNature;
  paymentOrigin: ObligationPaymentOrigin;
  expectedAmount?: ObligationMoney;
  dueOn?: string;
  status: ObligationOccurrenceStatus;
  waiverReason?: ObligationOccurrenceWaiverReason;
}>;

export type ObligationOccurrenceAction =
  | 'complete'
  | 'markNeedsAttention'
  | 'waive'
  | 'reopen';

export type ObligationOccurrenceListItem = Readonly<{
  id: Id<'obligationOccurrences'>;
  name: string;
  status: ObligationOccurrenceStatus;
  statusLabel: string;
  dueLabel: string;
  economicNatureLabel: string;
  paymentOriginLabel: string;
  expectedAmountLabel: string | null;
  waiverReasonLabel: string | null;
  actions: readonly ObligationOccurrenceAction[];
}>;

export const WAIVER_REASON_OPTIONS: readonly Readonly<{
  value: ObligationOccurrenceWaiverReason;
  label: string;
  description: string;
}>[] = [
  {
    value: 'notDueThisCompetence',
    label: 'Não vence nesta competência',
    description: 'O compromisso existe, mas não deve ser cobrado neste mês.',
  },
  {
    value: 'cancelledForCompetence',
    label: 'Cancelada nesta competência',
    description: 'O compromisso foi cancelado especificamente para este mês.',
  },
  {
    value: 'duplicateOccurrence',
    label: 'Ocorrência duplicada',
    description: 'Outra ocorrência já representa o mesmo compromisso.',
  },
];

const STATUS_ORDER: Readonly<Record<ObligationOccurrenceStatus, number>> = {
  needsAttention: 0,
  pending: 1,
  completed: 2,
  waived: 3,
};

const STATUS_LABELS: Readonly<Record<ObligationOccurrenceStatus, string>> = {
  pending: 'Pendente',
  needsAttention: 'Precisa de atenção',
  completed: 'Concluída manualmente',
  waived: 'Dispensada',
};

export function buildObligationOccurrenceListItems(
  occurrences: readonly ObligationOccurrence[],
): ObligationOccurrenceListItem[] {
  return [...occurrences]
    .sort((left, right) => {
      const statusDifference =
        STATUS_ORDER[left.status] - STATUS_ORDER[right.status];
      if (statusDifference !== 0) {
        return statusDifference;
      }

      return (
        (left.dueOn ?? '9999-12-31').localeCompare(
          right.dueOn ?? '9999-12-31',
        ) || left.name.localeCompare(right.name, 'pt-BR')
      );
    })
    .map((occurrence) => ({
      id: occurrence.occurrenceId,
      name: occurrence.name,
      status: occurrence.status,
      statusLabel: STATUS_LABELS[occurrence.status],
      dueLabel: occurrence.dueOn
        ? `Vence em ${formatOccurrenceDate(occurrence.dueOn)}`
        : 'Vencimento não informado',
      economicNatureLabel: formatObligationEconomicNature(
        occurrence.economicNature,
      ),
      paymentOriginLabel: formatObligationPaymentOrigin(
        occurrence.paymentOrigin,
      ),
      expectedAmountLabel: formatObligationExpectedAmount(
        occurrence.expectedAmount,
      ),
      waiverReasonLabel: occurrence.waiverReason
        ? formatWaiverReason(occurrence.waiverReason)
        : null,
      actions: actionsForStatus(occurrence.status),
    }));
}

export function currentOccurrenceCompetence(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    timeZone: 'America/Sao_Paulo',
  }).formatToParts(now);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;

  if (!year || !month) {
    throw new Error('CURRENT_COMPETENCE_UNAVAILABLE');
  }

  return `${year}-${month}`;
}

export function shiftOccurrenceCompetence(
  competence: string,
  offset: number,
): string {
  const match = /^(\d{4})-(\d{2})$/.exec(competence);
  const year = Number(match?.[1]);
  const month = Number(match?.[2]);

  if (!match || month < 1 || month > 12 || !Number.isInteger(offset)) {
    throw new Error('INVALID_COMPETENCE');
  }

  const shifted = new Date(Date.UTC(year, month - 1 + offset, 1));
  return `${shifted.getUTCFullYear()}-${String(
    shifted.getUTCMonth() + 1,
  ).padStart(2, '0')}`;
}

export function formatOccurrenceCompetence(competence: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(competence);

  if (!match) {
    throw new Error('INVALID_COMPETENCE');
  }

  return new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1)));
}

export function formatWaiverReason(
  reason: ObligationOccurrenceWaiverReason,
): string {
  const option = WAIVER_REASON_OPTIONS.find(
    (candidate) => candidate.value === reason,
  );

  if (!option) {
    throw new Error('UNKNOWN_WAIVER_REASON');
  }

  return option.label;
}

function actionsForStatus(
  status: ObligationOccurrenceStatus,
): readonly ObligationOccurrenceAction[] {
  switch (status) {
    case 'pending':
      return ['complete', 'markNeedsAttention', 'waive'];
    case 'needsAttention':
      return ['complete', 'waive', 'reopen'];
    case 'completed':
    case 'waived':
      return ['reopen'];
  }
}

function formatOccurrenceDate(isoDate: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
    .format(new Date(`${isoDate}T00:00:00.000Z`))
    .replace('.', '');
}
