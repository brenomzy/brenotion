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
