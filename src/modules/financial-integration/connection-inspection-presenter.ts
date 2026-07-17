import type { FunctionReturnType } from 'convex/server';

import { api } from '../../../convex/_generated/api';

export type ConnectionInspection = FunctionReturnType<
  typeof api.financialIntegration.inspectConnection
>;

export type ConnectionInspectionPresentation = Readonly<{
  tone: 'success' | 'warning' | 'neutral';
  title: string;
  description: string;
  connectorLabel: string;
  lastUpdatedLabel: string;
  consentLabel: string;
  coverageLabel: string;
}>;

const SAO_PAULO_TIME_ZONE = 'America/Sao_Paulo';

export function presentConnectionInspection(
  inspection: ConnectionInspection,
): ConnectionInspectionPresentation {
  const state = {
    ready: {
      tone: 'success' as const,
      title: 'Conexão pronta',
      description: 'Os dados disponíveis foram atualizados com sucesso.',
    },
    partial: {
      tone: 'warning' as const,
      title: 'Dados parciais',
      description: 'A conexão respondeu, mas recência ou cobertura ainda estão incompletas.',
    },
    unavailable: {
      tone: 'neutral' as const,
      title: 'Conexão indisponível',
      description: 'A conexão ainda não disponibilizou contas para esta verificação.',
    },
  }[inspection.availability];

  return {
    ...state,
    connectorLabel: inspection.connectorName,
    lastUpdatedLabel: formatLastUpdatedAt(inspection.lastUpdatedAt),
    consentLabel: formatConsentExpiry(inspection.consentExpiresAt),
    coverageLabel: formatCoverage(inspection.accounts),
  };
}

function formatLastUpdatedAt(value: string | null): string {
  if (!value) {
    return 'Atualização não informada';
  }

  return formatDateTime(value);
}

function formatConsentExpiry(value: string | null): string {
  return value ? `Válido até ${formatDateTime(value)}` : 'Sem vencimento definido';
}

function formatDateTime(value: string): string {
  const parts = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: SAO_PAULO_TIME_ZONE,
  }).formatToParts(new Date(value));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${values.day}/${values.month}/${values.year} às ${values.hour}:${values.minute}`;
}

function formatCoverage(accounts: ConnectionInspection['accounts']): string {
  if (!accounts) {
    return 'Cobertura de contas não disponível.';
  }

  const totalLabel = accounts.total === 1 ? 'conta detectada' : 'contas detectadas';
  const bankLabel = accounts.bank === 1 ? 'bancária' : 'bancárias';
  const creditLabel = accounts.credit === 1 ? 'cartão' : 'cartões';

  return `${accounts.total} ${totalLabel}: ${accounts.bank} ${bankLabel} e ${accounts.credit} ${creditLabel}.`;
}
