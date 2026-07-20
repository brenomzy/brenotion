export type PlanScenario =
  | 'loading'
  | 'empty'
  | 'recent'
  | 'partial'
  | 'stale'
  | 'offline'
  | 'error';

export type PlanStepStatus = 'confirmed' | 'pending' | 'unavailable';

export type PlanStep = Readonly<{
  id: string;
  order: number;
  scope: 'Empresa' | 'Pessoal';
  title: string;
  description: string;
  amountMinor: bigint | null;
  status: PlanStepStatus;
  statusLabel: string;
}>;

export type PlanScreenModel = Readonly<{
  scenario: PlanScenario;
  cycleLabel: string;
  asOfLabel: string;
  state: Readonly<{
    title: string;
    description: string;
    actionLabel?: string;
  }>;
  showsSnapshot: boolean;
  readOnly: boolean;
  steps: readonly PlanStep[];
}>;

export interface PlanScreenSource {
  get(scenario: PlanScenario): PlanScreenModel;
}

export type OperationalPlanData = Readonly<{
  cycle: Readonly<{
    financialCycleId: string;
    startedOn: string;
    expectedNextReceiptOn: string;
    timeZone: string;
    openedAt: number;
  }> | null;
  reportedExpenses: Readonly<{
    items: readonly Readonly<{
      status: 'provisional' | 'reconciled' | 'voided';
      sourcePatrimony: 'personal' | 'business' | 'needsConfirmation';
    }>[];
    isTruncated: boolean;
  }>;
}>;

export type OperationalPlanModel = Readonly<{
  status: 'noCycle' | 'active';
  cycleTitle: string;
  cycleDescription: string;
  expenseSummary: Readonly<{
    total: number;
    provisional: number;
    reconciled: number;
    voided: number;
    needsSourceConfirmation: number;
    isTruncated: boolean;
  }>;
  calculation: Readonly<{
    title: 'Cálculos financeiros indisponíveis';
    description: string;
  }>;
}>;

export function buildOperationalPlanModel(
  data: OperationalPlanData,
): OperationalPlanModel {
  const activeItems = data.reportedExpenses.items.filter(
    (expense) => expense.status !== 'voided',
  );
  const expenseSummary = {
    total: activeItems.length,
    provisional: activeItems.filter(
      (expense) => expense.status === 'provisional',
    ).length,
    reconciled: activeItems.filter(
      (expense) => expense.status === 'reconciled',
    ).length,
    voided: data.reportedExpenses.items.filter(
      (expense) => expense.status === 'voided',
    ).length,
    needsSourceConfirmation: activeItems.filter(
      (expense) => expense.sourcePatrimony === 'needsConfirmation',
    ).length,
    isTruncated: data.reportedExpenses.isTruncated,
  };

  return {
    status: data.cycle ? 'active' : 'noCycle',
    cycleTitle: data.cycle
      ? `Ciclo de ${formatPlanDate(data.cycle.startedOn)} a ${formatPlanDate(
          data.cycle.expectedNextReceiptOn,
        )}`
      : 'Ciclo Financeiro ainda não aberto',
    cycleDescription: data.cycle
      ? 'As datas foram confirmadas explicitamente pelo Titular e não representam uma competência mensal.'
      : 'Abra um ciclo entre dois recebimentos para acompanhar Gastos Informados. Nenhum limite será criado automaticamente.',
    expenseSummary,
    calculation: {
      title: 'Cálculos financeiros indisponíveis',
      description:
        'Plano Financeiro, Limite de Gasto do Ciclo, Limites por Categoria e Disponível para Gastar ainda não foram calculados. Os Gastos Informados permanecem provisórios até conciliação.',
    },
  };
}

function formatPlanDate(isoDate: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
    .format(new Date(`${isoDate}T00:00:00.000Z`))
    .replace('.', '');
}
