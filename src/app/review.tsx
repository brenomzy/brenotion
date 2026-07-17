import { useLocalSearchParams } from 'expo-router';

import { inMemoryReviewScreenSource } from '@/modules/review/in-memory-review-screen-source';
import { ReviewScreen } from '@/modules/review/review-screen';
import { type ReviewScenario } from '@/modules/review/review-screen-model';

const REVIEW_SCENARIOS = new Set<ReviewScenario>([
  'loading',
  'empty',
  'recent',
  'partial',
  'stale',
  'offline',
  'error',
  'uncertain',
]);

export default function ReviewRoute() {
  const { scenario } = useLocalSearchParams<{ scenario?: string | string[] }>();
  const requestedScenario = Array.isArray(scenario) ? scenario[0] : scenario;
  const activeScenario =
    requestedScenario && REVIEW_SCENARIOS.has(requestedScenario as ReviewScenario)
      ? (requestedScenario as ReviewScenario)
      : 'recent';

  return <ReviewScreen model={inMemoryReviewScreenSource.get(activeScenario)} />;
}
