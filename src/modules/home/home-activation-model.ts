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
    route: '/import' | '/review' | '/checklist' | '/close';
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

  if (!data.coverage.complete) {
    return {
      title: hasPreview
        ? 'Continue a atualização do mês'
        : 'Atualize o mês',
      description:
        'Reúna o Itaú Pessoal, a fatura e o Itaú Empresa em um único fluxo.',
      label: hasPreview ? 'Continuar atualização' : 'Atualizar mês',
      route: '/import',
    };
  }

  if (!reviewStarted) {
    return {
      title: 'Revise somente as exceções',
      description:
        'As entradas estão completas. Confirme apenas o que o Brenotion ainda não reconhece.',
      label: 'Revisar exceções',
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
          ? 'Prepare sua checklist mensal'
          : 'Revise os itens incompletos da checklist',
      description:
        'Organize o que precisa ser pago ou resolvido sem transformar a checklist em extrato bancário.',
      label: 'Abrir checklist',
      route: '/checklist',
    };
  }

  if (!data.monthlyClosure && closureReadyForReview) {
    return {
      title: 'Conclua a atualização do mês',
      description:
        'Confira o resultado e reconheça somente as lacunas que ainda não podem ser verificadas.',
      label: 'Concluir atualização',
      route: '/close',
    };
  }

  return {
    title: data.monthlyClosure
      ? 'Mês organizado'
      : 'Continue a atualização do mês',
    description:
      data.monthlyClosure
        ? 'A atualização desta competência foi registrada. Consulte a checklist durante o mês.'
        : 'A base está pronta para concluir as exceções restantes.',
    label: data.monthlyClosure ? 'Abrir checklist' : 'Revisar exceções',
    route: data.monthlyClosure ? '/checklist' : '/review',
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
