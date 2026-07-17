import {
  type HomeScenario,
  type HomeSnapshot,
  type HomeSnapshotResult,
  type HomeSnapshotSource,
  type SnapshotConfidence,
} from './home-snapshot-source';

const CONFIDENCE_BY_SCENARIO: Record<
  Exclude<HomeScenario, 'loading' | 'empty'>,
  SnapshotConfidence
> = {
  recent: {
    kind: 'recent',
    title: 'Retrato demonstrativo',
    description: 'Todas as fontes sintéticas estão incluídas neste retrato.',
  },
  partial: {
    kind: 'partial',
    title: 'Dados parciais',
    description: 'Uma fonte sintética não entrou neste retrato; o valor pode diminuir.',
  },
  stale: {
    kind: 'stale',
    title: 'Retrato desatualizado',
    description: 'Eventos depois de 12 de julho não estão representados.',
  },
  offline: {
    kind: 'offline',
    title: 'Você está offline',
    description: 'Mostrando o último retrato conhecido. Ações remotas estão indisponíveis.',
  },
  error: {
    kind: 'error',
    title: 'Não foi possível atualizar agora',
    description: 'Seu último retrato continua disponível e nenhum dado foi alterado.',
  },
};

function createSnapshot(scenario: Exclude<HomeScenario, 'loading' | 'empty'>): HomeSnapshot {
  const degraded = ['stale', 'offline', 'error'].includes(scenario);

  return {
    origin: {
      kind: 'synthetic',
      label: 'Dados sintéticos',
      disclosure: 'Demonstração com dados sintéticos',
    },
    asOf: degraded ? '2026-07-12T18:10:00-03:00' : '2026-07-15T12:32:00-03:00',
    availableToSpend: {
      amount: { amountMinor: 486000n, currency: 'BRL' },
      horizonDate: '2026-08-02T00:00:00-03:00',
      horizonDays: 18,
    },
    confidence: CONFIDENCE_BY_SCENARIO[scenario],
    scopes: [
      {
        scope: 'company',
        label: 'Empresa',
        reserveLabel: 'Reserva Operacional',
        protectedAmount: { amountMinor: 1524000n, currency: 'BRL' },
        targetAmount: { amountMinor: 3000000n, currency: 'BRL' },
        progressPercent: 51,
        progressLabel: '51% do marco',
        description: 'Provisões e Reserva Operacional',
      },
      {
        scope: 'personal',
        label: 'Pessoal',
        reserveLabel: 'Reserva Familiar',
        protectedAmount: { amountMinor: 318000n, currency: 'BRL' },
        targetAmount: { amountMinor: 1000000n, currency: 'BRL' },
        progressPercent: 32,
        progressLabel: '32% do marco',
        description: 'Reserva Familiar e Margem de Imprevistos',
      },
    ],
    nextObligation: {
      id: 'synthetic-obligation',
      title: 'Obrigação demonstrativa',
      scope: 'personal',
      dueDate: '2026-07-16T00:00:00-03:00',
      expectedAmount: { amountMinor: 19800n, currency: 'BRL' },
      supportingText: 'Pagamento ainda não identificado',
    },
  };
}

export const inMemoryHomeSnapshotSource: HomeSnapshotSource = {
  async load(scenario): Promise<HomeSnapshotResult> {
    if (scenario === 'loading') {
      return new Promise<HomeSnapshotResult>(() => undefined);
    }

    if (scenario === 'empty') {
      return {
        status: 'empty',
        title: 'Ainda não há um retrato financeiro',
        description: 'Conecte ou importe dados para começar. Nenhum cálculo oficial foi produzido.',
      };
    }

    return { status: 'ready', snapshot: createSnapshot(scenario) };
  },
};
