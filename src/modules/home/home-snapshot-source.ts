export type Currency = 'BRL';

export type Money = Readonly<{
  amountMinor: bigint;
  currency: Currency;
}>;

export type MoneyScope = 'company' | 'personal';

export type SnapshotConfidence = Readonly<{
  kind: 'recent' | 'partial' | 'stale' | 'offline' | 'error';
  title: string;
  description: string;
}>;

export type ScopeSummary = Readonly<{
  scope: MoneyScope;
  label: 'Empresa' | 'Pessoal';
  reserveLabel: 'Reserva Operacional' | 'Reserva Familiar';
  protectedAmount: Money;
  targetAmount: Money;
  progressPercent: number;
  progressLabel: string;
  description: string;
}>;

export type HomeSnapshot = Readonly<{
  origin: Readonly<{
    kind: 'synthetic';
    label: 'Dados sintéticos';
    disclosure: string;
  }>;
  asOf: string;
  availableToSpend: Readonly<{
    amount: Money;
    horizonDate: string;
    horizonDays: number;
  }>;
  confidence: SnapshotConfidence;
  scopes: readonly [ScopeSummary, ScopeSummary];
  nextObligation: Readonly<{
    id: string;
    title: string;
    scope: MoneyScope;
    dueDate: string;
    expectedAmount: Money;
    supportingText: string;
  }>;
}>;

export type HomeSnapshotResult =
  | Readonly<{ status: 'ready'; snapshot: HomeSnapshot }>
  | Readonly<{
      status: 'empty';
      title: string;
      description: string;
    }>
  | Readonly<{
      status: 'error';
      title: string;
      description: string;
    }>;

export type HomeScenario =
  | 'loading'
  | 'recent'
  | 'partial'
  | 'stale'
  | 'offline'
  | 'empty'
  | 'error';

export interface HomeSnapshotSource {
  load(scenario: HomeScenario): Promise<HomeSnapshotResult>;
}
