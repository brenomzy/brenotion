import {
  type ReviewAction,
  type ReviewScenario,
  type ReviewScreenModel,
  type ReviewScreenSource,
} from './review-screen-model';

const ACTIONS: readonly ReviewAction[] = [
  {
    id: 'obligation',
    scope: 'Pessoal',
    title: 'Revisar uma Obrigação próxima',
    description: 'A evidência sintética ainda não permite identificar o pagamento.',
    actionLabel: 'Revisar Obrigação',
    enabled: true,
  },
  {
    id: 'classification',
    scope: 'Empresa',
    title: 'Confirmar uma classificação',
    description: 'A sugestão alcança somente o item demonstrativo atual.',
    actionLabel: 'Confirmar classificação',
    enabled: true,
  },
  {
    id: 'installments',
    scope: 'Pessoal',
    title: 'Conferir compromissos futuros',
    description: 'Parcelamentos sintéticos podem afetar o próximo Ciclo Financeiro.',
    actionLabel: 'Conferir detalhes',
    enabled: true,
  },
];

const STATE_BY_SCENARIO: Record<ReviewScenario, ReviewScreenModel['state']> = {
  loading: {
    title: 'Preparando sua revisão',
    description: 'Reunindo pendências sem mostrar uma contagem provisória.',
  },
  empty: {
    title: 'Nada precisa da sua atenção',
    description: 'A revisão sintética foi concluída para o período demonstrativo.',
    actionLabel: 'Voltar ao Início',
  },
  recent: {
    title: 'Revisão pronta',
    description: 'Três itens demonstrativos precisam da sua atenção.',
    actionLabel: 'Começar revisão',
  },
  partial: {
    title: 'Revisão parcial',
    description: 'Você pode revisar as Obrigações conhecidas; uma fonte ainda falta.',
    actionLabel: 'Revisar o que está disponível',
  },
  stale: {
    title: 'Esta revisão usa dados de 12 de julho',
    description: 'Novos eventos podem não estar nesta fila.',
    actionLabel: 'Atualizar antes de revisar',
  },
  offline: {
    title: 'Você está offline',
    description: 'A fila em cache está disponível, mas decisões não podem ser salvas.',
    actionLabel: 'Tentar novamente',
  },
  error: {
    title: 'Não foi possível carregar toda a revisão',
    description: 'Suas decisões anteriores foram preservadas.',
    actionLabel: 'Tentar novamente',
  },
  uncertain: {
    title: 'Esta classificação precisa da sua confirmação',
    description: 'A sugestão sintética tem alcance limitado e não cria uma regra automaticamente.',
    actionLabel: 'Revisar sugestão',
  },
};

function actionsFor(scenario: ReviewScenario): readonly ReviewAction[] {
  if (scenario === 'empty' || scenario === 'loading') {
    return [];
  }

  if (scenario === 'uncertain') {
    return [ACTIONS[1]];
  }

  const limit = scenario === 'partial' ? 2 : 3;
  const enabled = !['stale', 'offline', 'error'].includes(scenario);
  return ACTIONS.slice(0, limit).map((action) => ({ ...action, enabled }));
}

export const inMemoryReviewScreenSource: ReviewScreenSource = {
  get(scenario) {
    return {
      scenario,
      periodLabel: scenario === 'stale' ? 'Revisão de 6–12 jul' : 'Revisão de 9–15 jul',
      state: STATE_BY_SCENARIO[scenario],
      completedCount: scenario === 'empty' ? 3 : 1,
      totalCount: scenario === 'empty' ? 3 : 4,
      progressPercent: scenario === 'empty' ? 100 : 25,
      showsSnapshot: !['loading', 'empty'].includes(scenario),
      actions: actionsFor(scenario),
    };
  },
};
