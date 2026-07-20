export type MonthlyClassificationLocalStatus =
  | 'requesting'
  | 'saving'
  | 'error'
  | null;

type MonthlyClassificationRequestState = Readonly<{
  competence: string | null;
  coverageComplete: boolean;
  reviewLoaded: boolean;
  hasJob: boolean;
  requestedCompetence: string | null;
  localStatus: MonthlyClassificationLocalStatus;
}>;

export function shouldRequestMonthlyClassification(
  state: MonthlyClassificationRequestState,
): boolean {
  return Boolean(
    state.competence &&
      state.coverageComplete &&
      state.reviewLoaded &&
      !state.hasJob &&
      state.requestedCompetence !== state.competence &&
      state.localStatus !== 'requesting',
  );
}
