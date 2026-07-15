import {
  type HomeScenario,
  type HomeSnapshot,
  type HomeSnapshotResult,
  type HomeSnapshotSource,
  type SnapshotConfidence,
} from '@/modules/home/home-snapshot-source';

const BRL = 'BRL' as const;

const CONFIDENCE_BY_SCENARIO: Record<
  Exclude<HomeScenario, 'empty' | 'error'>,
  SnapshotConfidence
> = {
  recent: {
    kind: 'recent',
    title: 'Cenário recente',
    description: 'Todas as fontes sintéticas estão incluídas neste retrato.',
  },
  partial: {
    kind: 'partial',
    title: 'Dados parciais',
    description: 'A fatura do cartão não está incluída; o disponível pode diminuir.',
  },
  stale: {
    kind: 'stale',
    title: 'Retrato desatualizado',
    description: 'Movimentações depois de 12 de julho não estão representadas.',
  },
};

function createSnapshot(scenario: Exclude<HomeScenario, 'empty' | 'error'>): HomeSnapshot {
  const asOf = scenario === 'stale' ? '2026-07-12T18:10:00-03:00' : '2026-07-15T12:32:00-03:00';

  return {
    origin: {
      kind: 'synthetic',
      label: 'Dados sintéticos',
      disclosure: 'Demonstração local — nenhuma conta financeira está sincronizada.',
    },
    asOf,
    availableToSpend: {
      amount: { amountMinor: 486000, currency: BRL },
      horizonDate: '2026-08-02T00:00:00-03:00',
      horizonDays: 18,
    },
    confidence: CONFIDENCE_BY_SCENARIO[scenario],
    scopes: [
      {
        scope: 'company',
        label: 'Empresa',
        protectedAmount: { amountMinor: 1524000, currency: BRL },
        description: 'Provisões e Reserva Operacional',
      },
      {
        scope: 'personal',
        label: 'Pessoal',
        protectedAmount: { amountMinor: 318000, currency: BRL },
        description: 'Reserva Familiar e Margem de Imprevistos',
      },
    ],
    nextObligation: {
      id: 'synthetic-energy-2026-07',
      title: 'Energia',
      scope: 'personal',
      dueDate: '2026-07-16T00:00:00-03:00',
      expectedAmount: { amountMinor: 19800, currency: BRL },
      supportingText: 'Pagamento ainda não identificado',
    },
  };
}

class InMemoryHomeSnapshotSource implements HomeSnapshotSource {
  private recoveredFromSyntheticError = false;

  async load(scenario: HomeScenario): Promise<HomeSnapshotResult> {
    await Promise.resolve();

    if (scenario === 'empty') {
      return {
        status: 'empty',
        title: 'Ainda não há um retrato financeiro',
        description:
          'O primeiro retrato aparecerá depois que as fontes e o ciclo forem preparados.',
      };
    }

    if (scenario === 'error' && !this.recoveredFromSyntheticError) {
      this.recoveredFromSyntheticError = true;

      return {
        status: 'error',
        title: 'Não foi possível carregar o retrato',
        description: 'Os dados preservados não foram alterados. Tente carregar novamente.',
      };
    }

    return {
      status: 'ready',
      snapshot: createSnapshot(scenario === 'error' ? 'recent' : scenario),
    };
  }
}

export const inMemoryHomeSnapshotSource = new InMemoryHomeSnapshotSource();
