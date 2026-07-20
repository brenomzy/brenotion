import { creditCardSpendingCompetence } from '../../../shared/credit-card-competence';

export type MonthlyImportSourceId =
  | 'personalBank'
  | 'creditCard'
  | 'businessBank';

export type MonthlyImportStatus = 'missing' | 'preview' | 'confirmed';

export type MonthlyImportCoverageSource = {
  source: MonthlyImportSourceId;
  expectedFormat: 'ofx' | 'itauCreditCardXlsx';
  expectedSourcePatrimony: 'personal' | 'business';
  status: MonthlyImportStatus;
  periodStart: string | null;
  periodEnd: string | null;
  statementCompetence: string | null;
  transactionCount: number;
  importedAt: number | null;
};

export type MonthlyImportCoverage = {
  competence: string;
  complete: boolean;
  isSearchExhaustive: boolean;
  sources: MonthlyImportCoverageSource[];
};

export type MonthlyImportCoverageItem = {
  source: MonthlyImportSourceId;
  title: string;
  formatLabel: string;
  originLabel: string;
  status: MonthlyImportStatus;
  statusLabel: string;
  description: string;
  actionLabel: string;
};

export type MonthlyImportCoverageViewModel = {
  competence: string;
  competenceLabel: string;
  complete: boolean;
  confirmedCount: number;
  summary: string;
  items: MonthlyImportCoverageItem[];
};

const SOURCE_METADATA: Record<
  MonthlyImportSourceId,
  Pick<MonthlyImportCoverageItem, 'title' | 'formatLabel'>
> = {
  personalBank: {
    title: 'Itaú Pessoal',
    formatLabel: 'Extrato OFX',
  },
  creditCard: {
    title: 'Fatura do cartão',
    formatLabel: 'Fatura XLSX',
  },
  businessBank: {
    title: 'Itaú Empresa',
    formatLabel: 'Extrato OFX',
  },
};

const SOURCE_ORDER: MonthlyImportSourceId[] = [
  'personalBank',
  'creditCard',
  'businessBank',
];

export function buildMonthlyImportCoverageView(
  coverage: MonthlyImportCoverage,
): MonthlyImportCoverageViewModel {
  const bySource = new Map(coverage.sources.map((source) => [source.source, source]));
  const items = SOURCE_ORDER.map((sourceId) => {
    const source = bySource.get(sourceId);

    if (!source) {
      throw new Error(`MONTHLY_IMPORT_SOURCE_MISSING:${sourceId}`);
    }

    return toCoverageItem(source);
  });
  const confirmedCount = items.filter((item) => item.status === 'confirmed').length;

  return {
    competence: coverage.competence,
    competenceLabel: formatCompetenceLabel(coverage.competence),
    complete: coverage.complete,
    confirmedCount,
    summary: !coverage.isSearchExhaustive
      ? `${confirmedCount} de 3 fontes adicionadas entre os dados recentes. O histórico completo ainda não foi verificado.`
      : coverage.complete
        ? 'As três fontes estão prontas. Continue para conferir somente o que precisa da sua atenção.'
        : `${confirmedCount} de 3 fontes adicionadas. Escolha a próxima fonte para continuar.`,
    items,
  };
}

export function currentCompetence(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function expectedSourcePatrimonyFor(
  source: MonthlyImportSourceId,
): 'personal' | 'business' {
  return source === 'businessBank' ? 'business' : 'personal';
}

export function shiftCompetence(competence: string, offset: number): string {
  const { year, month } = parseCompetence(competence);
  const shifted = new Date(Date.UTC(year, month - 1 + offset, 1));

  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function formatCompetenceLabel(competence: string): string {
  const { year, month } = parseCompetence(competence);

  return new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function toCoverageItem(
  source: MonthlyImportCoverageSource,
): MonthlyImportCoverageItem {
  const metadata = SOURCE_METADATA[source.source];
  const originLabel =
    source.expectedSourcePatrimony === 'personal' ? 'Pessoal' : 'Empresa';
  const spendingCompetence =
    source.source === 'creditCard'
      ? creditCardSpendingCompetence(source.statementCompetence)
      : null;
  const cardTimingDescription =
    source.statementCompetence && spendingCompetence
      ? `Fatura paga em ${formatCompetenceLabel(source.statementCompetence)}, com gastos de ${formatCompetenceLabel(spendingCompetence)}. `
      : '';

  if (source.status === 'confirmed') {
    return {
      source: source.source,
      ...metadata,
      originLabel,
      status: source.status,
      statusLabel: 'Confirmado',
      description:
        cardTimingDescription +
        (source.transactionCount === 1
          ? '1 movimentação adicionada neste mês.'
          : `${source.transactionCount} movimentações adicionadas neste mês.`),
      actionLabel: 'Ver dados',
    };
  }

  if (source.status === 'preview') {
    return {
      source: source.source,
      ...metadata,
      originLabel,
      status: source.status,
      statusLabel: 'Prévia pendente',
      description:
        cardTimingDescription +
        'A prévia ainda precisa ser confirmada para concluir esta fonte.',
      actionLabel: 'Continuar',
    };
  }

  return {
    source: source.source,
    ...metadata,
    originLabel,
    status: source.status,
    statusLabel: 'Pendente',
    description: 'Adicione o arquivo desta fonte para completar o mês.',
    actionLabel: 'Adicionar arquivo',
  };
}

function parseCompetence(competence: string): { year: number; month: number } {
  const match = /^(\d{4})-(\d{2})$/.exec(competence);
  const year = Number(match?.[1]);
  const month = Number(match?.[2]);

  if (!match || month < 1 || month > 12) {
    throw new Error('INVALID_COMPETENCE');
  }

  return { year, month };
}
