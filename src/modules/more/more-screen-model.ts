export type MoreScenario =
  | 'loading'
  | 'empty'
  | 'recent'
  | 'partial'
  | 'stale'
  | 'offline'
  | 'error';

export type MoreScreenModel = Readonly<{
  scenario: MoreScenario;
  state: Readonly<{
    title: string;
    description: string;
    actionLabel?: string;
  }>;
}>;

export interface MoreScreenSource {
  get(scenario: MoreScenario): MoreScreenModel;
}
