export type HomeActivationSource = Readonly<{
  source: 'personalBank' | 'creditCard' | 'businessBank';
  status: 'missing' | 'preview' | 'confirmed';
  transactionCount: number;
}>;

export type HomeActivationData = Readonly<{
  competence: string;
  coverage: Readonly<{
    complete: boolean;
    confirmedCount: number;
    isSearchExhaustive: boolean;
    sources: readonly HomeActivationSource[];
  }>;
  review: Readonly<{
    classificationDecisionCount: number;
    isSearchExhaustive: boolean;
  }>;
  obligations: Readonly<{
    activeCount: number;
    needsPaymentOriginConfirmationCount: number;
    isSearchExhaustive: boolean;
  }>;
  monthlyClosure: Readonly<{
    closureId: string;
    revisionNumber: bigint;
    closedAt: number;
    confidenceAtClosure: 'partial';
    financialCalculationStatus: 'unavailable';
  }> | null;
  officialSnapshot: Readonly<{
    asOf: number;
    confidence: 'recent' | 'partial' | 'stale';
    calculationVersion: string;
  }> | null;
}>;

export type HomeActivationStep = Readonly<{
  id: 'coverage' | 'review' | 'obligations' | 'closure';
  title: string;
  status: 'done' | 'inProgress' | 'pending' | 'attention';
  statusLabel: string;
  description: string;
}>;

export type HomeActivationModel = Readonly<{
  competence: string;
  competenceLabel: string;
  coverageSummary: string;
  sources: readonly Readonly<{
    id: HomeActivationSource['source'];
    title: string;
    status: HomeActivationSource['status'];
    statusLabel: string;
    description: string;
  }>[];
  steps: readonly HomeActivationStep[];
  nextAction: Readonly<{
    title: string;
    description: string;
    label: string;
    route: '/import' | '/review' | '/obligations' | '/close';
  }>;
  monthlyClosure: Readonly<{
    status: 'missing' | 'closed';
    title: string;
    description: string;
    revisionLabel: string | null;
    closedAt: number | null;
  }>;
  officialSnapshot: Readonly<{
    title: string;
    description: string;
    asOf: number | null;
  }>;
  hasBoundedSearchWarning: boolean;
}>;

const SOURCE_TITLES: Record<HomeActivationSource['source'], string> = {
  personalBank: 'Itaú Pessoal',
  creditCard: 'Fatura do cartão',
  businessBank: 'Itaú Empresa',
};

export function buildHomeActivationModel(
  data: HomeActivationData,
): HomeActivationModel {
  const sources = data.coverage.sources.map((source) => ({
    id: source.source,
    title: SOURCE_TITLES[source.source],
    status: source.status,
    statusLabel:
      source.status === 'confirmed'
        ? 'Confirmado'
        : source.status === 'preview'
          ? 'Prévia pendente'
          : 'Pendente',
    description:
      source.status === 'confirmed'
        ? formatTransactionCount(source.transactionCount)
        : source.status === 'preview'
          ? 'A conferência deste arquivo ainda não foi concluída.'
          : 'Nenhum lote encontrado para esta competência.',
  }));
  const reviewStarted = data.review.classificationDecisionCount > 0;
  const obligationsConfigured = data.obligations.activeCount > 0;
  const obligationOriginsPending =
    data.obligations.needsPaymentOriginConfirmationCount > 0;
  const closureReadyForReview =
    data.coverage.confirmedCount > 0 &&
    reviewStarted &&
    obligationsConfigured &&
    !obligationOriginsPending;
  const steps: readonly HomeActivationStep[] = [
    {
      id: 'coverage',
      title: 'Entradas mensais',
      status: data.coverage.complete ? 'done' : 'pending',
      statusLabel: data.coverage.complete
        ? '3 de 3 confirmadas'
        : `${data.coverage.confirmedCount} de 3 confirmadas`,
      description: data.coverage.complete
        ? 'As três fontes esperadas estão presentes nesta competência.'
        : 'Fontes ausentes ou em prévia ainda reduzem a confiança.',
    },
    {
      id: 'review',
      title: 'Revisão e Natureza Econômica',
      status: reviewStarted ? 'inProgress' : 'pending',
      statusLabel: reviewStarted
        ? formatDecisionCount(data.review.classificationDecisionCount)
        : 'Ainda não iniciada',
      description: reviewStarted
        ? 'A revisão começou, mas isso ainda não fecha a competência.'
        : 'Confirme grupos como Pessoal ou Empresa sem alterar valores oficiais.',
    },
    {
      id: 'obligations',
      title: 'Obrigações recorrentes',
      status: obligationOriginsPending
        ? 'attention'
        : obligationsConfigured
          ? 'done'
          : 'pending',
      statusLabel: obligationOriginsPending
        ? `${data.obligations.needsPaymentOriginConfirmationCount} com origem a confirmar`
        : obligationsConfigured
          ? formatObligationCount(data.obligations.activeCount)
          : 'Nenhuma configurada',
      description: obligationOriginsPending
        ? 'Revise a origem pagadora habitual sem mudar a Natureza Econômica.'
        : obligationsConfigured
          ? 'As configurações recorrentes estão prontas para a próxima etapa.'
          : 'Cadastre compromissos recorrentes; nenhuma cobrança será iniciada.',
    },
    {
      id: 'closure',
      title: 'Fechamento Mensal',
      status: data.monthlyClosure
        ? 'done'
        : closureReadyForReview
          ? 'attention'
          : 'pending',
      statusLabel: data.monthlyClosure
        ? `Revisão ${data.monthlyClosure.revisionNumber.toString()} registrada`
        : closureReadyForReview
          ? 'Pronto para revisar lacunas'
          : 'Aguardando preparação',
      description: data.monthlyClosure
        ? 'O registro parcial preserva cobertura e lacunas desta competência, sem valores financeiros oficiais.'
        : closureReadyForReview
          ? 'Confira a readiness e reconheça somente as lacunas permitidas antes de fechar.'
          : 'Inicie entradas, Revisão e Obrigações antes de preparar este registro parcial.',
    },
  ];

  return {
    competence: data.competence,
    competenceLabel: formatCompetenceLabel(data.competence),
    coverageSummary: data.coverage.complete
      ? 'As três entradas mensais estão confirmadas.'
      : `${data.coverage.confirmedCount} de 3 entradas mensais confirmadas.`,
    sources,
    steps,
    nextAction: selectNextAction(data),
    monthlyClosure: data.monthlyClosure
      ? {
          status: 'closed',
          title: 'Fechamento Mensal registrado',
          description:
            'Este registro é parcial e contém metadados da competência. Disponível para Gastar e limites continuam indisponíveis.',
          revisionLabel: `Revisão ${data.monthlyClosure.revisionNumber.toString()}`,
          closedAt: data.monthlyClosure.closedAt,
        }
      : {
          status: 'missing',
          title: 'Fechamento Mensal ainda não registrado',
          description:
            'Quando a base operacional estiver iniciada, revise cobertura e lacunas sem publicar quantias oficiais.',
          revisionLabel: null,
          closedAt: null,
        },
    officialSnapshot: data.officialSnapshot
      ? {
          title: 'Retrato oficial disponível',
          description:
            'Existe um retrato calculado e versionado. Esta ativação mostra apenas sua referência, sem misturar estimativas.',
          asOf: data.officialSnapshot.asOf,
        }
      : {
          title: 'Retrato financeiro ainda não publicado',
          description:
            'O Início não exibirá Disponível para Gastar, reservas ou saldos até existir um cálculo oficial versionado.',
          asOf: null,
        },
    hasBoundedSearchWarning:
      !data.coverage.isSearchExhaustive ||
      !data.review.isSearchExhaustive ||
      !data.obligations.isSearchExhaustive,
  };
}

export function currentHomeCompetence(now = new Date()): string {
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

export function shiftHomeCompetence(
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

function selectNextAction(
  data: HomeActivationData,
): HomeActivationModel['nextAction'] {
  const hasPreview = data.coverage.sources.some(
    (source) => source.status === 'preview',
  );
  const reviewStarted = data.review.classificationDecisionCount > 0;
  const obligationsStarted = data.obligations.activeCount > 0;
  const closureReadyForReview =
    data.coverage.confirmedCount > 0 &&
    reviewStarted &&
    obligationsStarted &&
    data.obligations.needsPaymentOriginConfirmationCount === 0;

  if (!data.monthlyClosure && closureReadyForReview) {
    return {
      title: 'Prepare o Fechamento Mensal',
      description:
        'Revise cobertura e lacunas desta competência. O registro será parcial e não publicará valores financeiros.',
      label: 'Revisar Fechamento',
      route: '/close',
    };
  }

  if (!data.coverage.complete) {
    return {
      title: hasPreview
        ? 'Conclua a conferência dos arquivos'
        : 'Complete as entradas desta competência',
      description:
        'Comece pela cobertura mensal. Nenhum arquivo será confirmado sem sua decisão explícita.',
      label: hasPreview ? 'Continuar importação' : 'Adicionar arquivo',
      route: '/import',
    };
  }

  if (!reviewStarted) {
    return {
      title: 'Comece a revisão das movimentações',
      description:
        'Confirme a Natureza Econômica dos grupos. Isso ainda não é um Fechamento Mensal.',
      label: 'Abrir Revisar',
      route: '/review',
    };
  }

  if (
    !obligationsStarted ||
    data.obligations.needsPaymentOriginConfirmationCount > 0
  ) {
    return {
      title:
        data.obligations.activeCount === 0
          ? 'Configure suas Obrigações'
          : 'Revise as Obrigações incompletas',
      description:
        'Registre compromissos recorrentes e mantenha Natureza Econômica e origem pagadora independentes.',
      label: 'Abrir Obrigações',
      route: '/obligations',
    };
  }

  return {
    title: data.monthlyClosure
      ? 'Continue o acompanhamento mensal'
      : 'Continue a revisão mensal',
    description:
      data.monthlyClosure
        ? 'O Fechamento desta competência já foi registrado. Continue conferindo grupos e conciliações sem refazê-lo como única ação.'
        : 'A base operacional está montada. Continue conferindo grupos e conciliações antes do futuro fechamento.',
    label: 'Continuar revisão',
    route: '/review',
  };
}

function formatCompetenceLabel(competence: string): string {
  const [year, month] = competence.split('-').map(Number);
  return new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function formatTransactionCount(count: number): string {
  return count === 1
    ? '1 movimentação estruturada.'
    : `${count} movimentações estruturadas.`;
}

function formatDecisionCount(count: number): string {
  return count === 1
    ? '1 decisão confirmada no histórico'
    : `${count} decisões confirmadas no histórico`;
}

function formatObligationCount(count: number): string {
  return count === 1 ? '1 Obrigação ativa' : `${count} Obrigações ativas`;
}
