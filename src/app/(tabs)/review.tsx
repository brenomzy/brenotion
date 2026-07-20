import { router, useLocalSearchParams, type ErrorBoundaryProps } from 'expo-router';

import {
  getSyntheticReviewModel,
  type SyntheticReviewScenario,
} from '@/modules/review/in-memory-review-screen-source';
import { ReviewScreen } from '@/modules/review/review-screen';
import { useReviewScreenSource } from '@/modules/review/use-review-screen-source';

const SYNTHETIC_SCENARIOS = new Set<SyntheticReviewScenario>(['loading', 'empty', 'error']);

export default function ReviewRoute() {
  const { scenario, competence } = useLocalSearchParams<{
    scenario?: string | string[];
    competence?: string | string[];
  }>();
  const requestedScenario = Array.isArray(scenario) ? scenario[0] : scenario;
  const requestedCompetence = Array.isArray(competence)
    ? competence[0]
    : competence;
  const validCompetence =
    requestedCompetence &&
    /^\d{4}-(0[1-9]|1[0-2])$/.test(requestedCompetence)
      ? requestedCompetence
      : null;
  const source = useReviewScreenSource();
  const syntheticScenario =
    requestedScenario &&
    SYNTHETIC_SCENARIOS.has(requestedScenario as SyntheticReviewScenario)
      ? (requestedScenario as SyntheticReviewScenario)
      : null;
  const model = syntheticScenario ? getSyntheticReviewModel(syntheticScenario) : source.model;

  return (
    <ReviewScreen
      model={model}
      actions={{
        selectBatch: source.selectBatch,
        loadMoreBatches: source.loadMoreBatches,
        loadMoreTransactions: source.loadMoreTransactions,
        retry: () =>
          router.replace({
            pathname: '/review',
            params: validCompetence ? { competence: validCompetence } : {},
          }),
        startImport: () =>
          router.push({
            pathname: '/import',
            params: validCompetence ? { competence: validCompetence } : {},
          }),
      }}
    />
  );
}

export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return (
    <ReviewScreen
      model={{
        status: 'error',
        origin: { kind: 'persisted' },
        title: 'Não foi possível carregar suas importações',
        description:
          'Nenhuma movimentação foi alterada. Tente novamente ou volte às opções de importação.',
      }}
      actions={{
        selectBatch: () => undefined,
        loadMoreBatches: () => undefined,
        loadMoreTransactions: () => undefined,
        retry: () => void retry(),
        startImport: () => router.push('/import'),
      }}
    />
  );
}
