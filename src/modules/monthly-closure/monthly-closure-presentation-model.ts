import { formatCompetenceLabel } from '../imports/monthly-import-coverage-model';

export type MonthlyClosureSourceId =
  | 'personalBank'
  | 'creditCard'
  | 'businessBank';

export type MonthlyClosureSourceStatus = 'missing' | 'preview' | 'confirmed';

export type MonthlyClosureCheckStatus =
  | 'passed'
  | 'needsAcknowledgement'
  | 'blocked'
  | 'unavailable';

export type MonthlyClosureReadinessCheck = Readonly<{
  code: string;
  title: string;
  description: string;
  status: MonthlyClosureCheckStatus;
  acknowledgementAllowed: boolean;
}>;

export type MonthlyClosureReadiness = Readonly<{
  competence: string;
  status: 'ready' | 'attention' | 'blocked';
  fingerprint: string;
  sources: readonly Readonly<{
    source: MonthlyClosureSourceId;
    status: MonthlyClosureSourceStatus;
  }>[];
  checks: readonly MonthlyClosureReadinessCheck[];
}>;

export type ClosedMonthlyClosure = Readonly<{
  closureId: string;
  competence: string;
  revisionNumber: bigint;
  closedAt: number;
  confidenceAtClosure: 'partial';
  financialCalculationStatus: 'unavailable';
  acknowledgedCheckCodes: readonly string[];
}>;

export type MonthlyClosureSourceItem = Readonly<{
  source: MonthlyClosureSourceId;
  title: string;
  status: MonthlyClosureSourceStatus;
  statusLabel: string;
}>;

export type ClosedMonthlyClosureView = Readonly<{
  revisionLabel: string;
  closedAtLabel: string;
  confidenceLabel: string;
  calculationTitle: string;
  calculationDescription: string;
}>;

export type MonthlyClosureViewModel = Readonly<{
  competence: string;
  competenceLabel: string;
  status: MonthlyClosureReadiness['status'];
  statusTitle: string;
  statusDescription: string;
  sources: readonly MonthlyClosureSourceItem[];
  passedChecks: readonly MonthlyClosureReadinessCheck[];
  acknowledgementChecks: readonly MonthlyClosureReadinessCheck[];
  blockingChecks: readonly MonthlyClosureReadinessCheck[];
  closureHistory: readonly ClosedMonthlyClosureView[];
  existingClosure: ClosedMonthlyClosureView | null;
}>;

const SOURCE_ORDER: readonly MonthlyClosureSourceId[] = [
  'personalBank',
  'creditCard',
  'businessBank',
];

const SOURCE_TITLE: Record<MonthlyClosureSourceId, string> = {
  personalBank: 'Itaú Pessoal',
  creditCard: 'Fatura do cartão',
  businessBank: 'Itaú Empresa',
};

const SOURCE_STATUS_LABEL: Record<MonthlyClosureSourceStatus, string> = {
  confirmed: 'Confirmado',
  preview: 'Prévia pendente',
  missing: 'Ausente',
};

export function buildMonthlyClosureViewModel(
  readiness: MonthlyClosureReadiness,
  closedRevisions: readonly ClosedMonthlyClosure[],
): MonthlyClosureViewModel {
  const existingClosure = closedRevisions[0] ?? null;
  const sourceById = new Map(
    readiness.sources.map((source) => [source.source, source]),
  );
  const sources = SOURCE_ORDER.map((sourceId) => {
    const source = sourceById.get(sourceId);

    if (!source) {
      throw new Error(`MONTHLY_CLOSURE_SOURCE_MISSING:${sourceId}`);
    }

    return {
      source: source.source,
      title: SOURCE_TITLE[source.source],
      status: source.status,
      statusLabel: SOURCE_STATUS_LABEL[source.status],
    };
  });
  const passedChecks = readiness.checks.filter(
    (check) => check.status === 'passed',
  );
  const acknowledgementChecks = readiness.checks.filter(
    (check) =>
      check.status !== 'passed' &&
      check.status !== 'blocked' &&
      check.acknowledgementAllowed,
  );
  const blockingChecks = readiness.checks.filter(
    (check) =>
      check.status === 'blocked' ||
      (check.status !== 'passed' && !check.acknowledgementAllowed),
  );

  return {
    competence: readiness.competence,
    competenceLabel: formatCompetenceLabel(readiness.competence),
    status: readiness.status,
    statusTitle:
      existingClosure !== null
        ? 'Competência fechada'
        : blockingChecks.length > 0
          ? 'Ainda não pode ser fechada'
          : acknowledgementChecks.length > 0
            ? 'Revise as lacunas'
            : 'Pronta para fechar',
    statusDescription:
      existingClosure !== null
        ? 'O Fechamento preserva a revisão confirmada pelo Titular.'
        : blockingChecks.length > 0
          ? 'Resolva os bloqueios abaixo antes de confirmar o Fechamento Mensal.'
          : acknowledgementChecks.length > 0
            ? 'Algumas capacidades ainda não estão disponíveis. Confirme cada ciência antes de fechar.'
            : 'As verificações disponíveis passaram. O fechamento só acontece pelo botão abaixo.',
    sources,
    passedChecks,
    acknowledgementChecks,
    blockingChecks,
    closureHistory: closedRevisions.map((closure) => ({
      revisionLabel: `Revisão ${closure.revisionNumber.toString()}`,
      closedAtLabel: formatClosedAt(closure.closedAt),
      confidenceLabel: formatConfidence(closure.confidenceAtClosure),
      calculationTitle: 'Valores financeiros indisponíveis',
      calculationDescription:
        'Este Fechamento registra cobertura e lacunas. Disponível para Gastar e limites ainda não foram calculados.',
    })),
    existingClosure: existingClosure
      ? {
          revisionLabel: `Revisão ${existingClosure.revisionNumber.toString()}`,
          closedAtLabel: formatClosedAt(existingClosure.closedAt),
          confidenceLabel: formatConfidence(existingClosure.confidenceAtClosure),
          calculationTitle: 'Valores financeiros indisponíveis',
          calculationDescription:
            'Este Fechamento registra cobertura e lacunas. Disponível para Gastar e limites ainda não foram calculados.',
        }
      : null,
  };
}

export function canConfirmMonthlyClosure(
  viewModel: MonthlyClosureViewModel,
  acknowledgedCheckCodes: ReadonlySet<string>,
): boolean {
  if (viewModel.existingClosure || viewModel.blockingChecks.length > 0) {
    return false;
  }

  return viewModel.acknowledgementChecks.every((check) =>
    acknowledgedCheckCodes.has(check.code),
  );
}

export function sanitizeAcknowledgedCheckCodes(
  viewModel: MonthlyClosureViewModel,
  acknowledgedCheckCodes: ReadonlySet<string>,
): string[] {
  return viewModel.acknowledgementChecks
    .map((check) => check.code)
    .filter((code) => acknowledgedCheckCodes.has(code))
    .sort();
}

export function createMonthlyClosureIdempotencyKey(
  competence: string,
  fingerprint: string,
  attemptId: string,
): string {
  return ['monthly-closure-v1', competence, fingerprint, attemptId].join(':');
}

function formatClosedAt(timestamp: number): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date(timestamp));
}

function formatConfidence(
  confidence: ClosedMonthlyClosure['confidenceAtClosure'],
): string {
  switch (confidence) {
    case 'partial':
      return 'Confiança parcial';
  }
}
