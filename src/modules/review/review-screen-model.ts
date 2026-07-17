export type ReviewScenario =
  | 'loading'
  | 'empty'
  | 'recent'
  | 'partial'
  | 'stale'
  | 'offline'
  | 'error'
  | 'uncertain';

export type ReviewAction = Readonly<{
  id: string;
  scope: 'Empresa' | 'Pessoal';
  title: string;
  description: string;
  actionLabel: string;
  enabled: boolean;
}>;

export type ReviewScreenModel = Readonly<{
  scenario: ReviewScenario;
  periodLabel: string;
  state: Readonly<{
    title: string;
    description: string;
    actionLabel?: string;
  }>;
  completedCount: number;
  totalCount: number;
  progressPercent: number;
  showsSnapshot: boolean;
  actions: readonly ReviewAction[];
}>;

export interface ReviewScreenSource {
  get(scenario: ReviewScenario): ReviewScreenModel;
}
