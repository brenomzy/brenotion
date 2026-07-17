import {
  type PlanScenario,
  type PlanScreenModel,
  type PlanScreenSource,
  type PlanStep,
} from './plan-screen-model';

const BASE_STEPS: readonly PlanStep[] = [
  {
    id: 'business-obligations',
    order: 1,
    scope: 'Empresa',
    title: 'Provisão de Obrigações',
    description: 'Impostos e compromissos empresariais conhecidos',
    amountMinor: 248000n,
    status: 'confirmed',
    statusLabel: 'Separação confirmada',
  },
  {
    id: 'pro-labore',
    order: 2,
    scope: 'Empresa',
    title: 'Pró-labore',
    description: 'Ação manual da Empresa para o Titular',
    amountMinor: 320000n,
    status: 'pending',
    statusLabel: 'Ação manual pendente',
  },
  {
    id: 'unexpected-margin',
    order: 3,
    scope: 'Pessoal',
    title: 'Margem de Imprevistos',
    description: 'Proteção para variações deste Ciclo Financeiro',
    amountMinor: 146000n,
    status: 'confirmed',
    statusLabel: 'Proteção confirmada',
  },
  {
    id: 'family-reserve',
    order: 4,
    scope: 'Pessoal',
    title: 'Reserva Familiar',
    description: 'Contribuição sintética prevista para o ciclo',
    amountMinor: 210000n,
    status: 'pending',
    statusLabel: 'Ação manual pendente',
  },
];

const STATE_BY_SCENARIO: Record<PlanScenario, PlanScreenModel['state']> = {
  loading: {
    title: 'Preparando o Plano Financeiro',
    description: 'Organizando a ordem das alocações sem sugerir valores provisórios.',
  },
  empty: {
    title: 'Ainda não há um Plano Financeiro para este ciclo',
    description: 'Falta preparar o Ciclo Financeiro e os dados mínimos do Recebimento Empresarial.',
    actionLabel: 'Ver dados necessários',
  },
  recent: {
    title: 'Plano demonstrativo preparado',
    description: 'A estrutura usa dados sintéticos com referência em 15 de julho, às 12:32.',
    actionLabel: 'Ver ações do plano',
  },
  partial: {
    title: 'Plano incompleto',
    description: 'Falta confirmar uma fonte. As etapas conhecidas permanecem visíveis.',
    actionLabel: 'Completar dados',
  },
  stale: {
    title: 'Plano calculado em 12 de julho',
    description: 'Atualize os dados antes de executar as ações restantes.',
    actionLabel: 'Atualizar Plano Financeiro',
  },
  offline: {
    title: 'Plano disponível offline para consulta',
    description: 'Mostrando o último plano conhecido. Confirmações exigem conexão.',
    actionLabel: 'Tentar novamente',
  },
  error: {
    title: 'Não foi possível atualizar o plano',
    description: 'Nenhuma ação foi alterada. O último Plano Financeiro válido foi preservado.',
    actionLabel: 'Tentar novamente',
  },
};

function stepsFor(scenario: PlanScenario): readonly PlanStep[] {
  if (scenario === 'empty') {
    return BASE_STEPS.map((step) => ({
      ...step,
      amountMinor: null,
      status: 'unavailable',
      statusLabel: 'Etapa explicativa',
    }));
  }

  if (scenario !== 'partial') {
    return BASE_STEPS;
  }

  return BASE_STEPS.map((step) =>
    step.id === 'family-reserve'
      ? {
          ...step,
          amountMinor: null,
          status: 'unavailable',
          statusLabel: 'Aguardando dados',
        }
      : step
  );
}

export const inMemoryPlanScreenSource: PlanScreenSource = {
  get(scenario) {
    return {
      scenario,
      cycleLabel: 'Ciclo Financeiro · 3 jul – 2 ago',
      asOfLabel: scenario === 'stale' ? 'Referência: 12 de julho, 18:10' : 'Referência: 15 de julho, 12:32',
      state: STATE_BY_SCENARIO[scenario],
      showsSnapshot: !['loading', 'empty'].includes(scenario),
      readOnly: ['stale', 'offline', 'error'].includes(scenario),
      steps: stepsFor(scenario),
    };
  },
};
