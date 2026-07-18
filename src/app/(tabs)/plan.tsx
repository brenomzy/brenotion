import { useLocalSearchParams } from 'expo-router';

import { inMemoryPlanScreenSource } from '@/modules/plan/in-memory-plan-screen-source';
import { PlanScreen } from '@/modules/plan/plan-screen';
import { type PlanScenario } from '@/modules/plan/plan-screen-model';

const PLAN_SCENARIOS = new Set<PlanScenario>([
  'loading',
  'empty',
  'recent',
  'partial',
  'stale',
  'offline',
  'error',
]);

export default function PlanRoute() {
  const { scenario } = useLocalSearchParams<{ scenario?: string | string[] }>();
  const requestedScenario = Array.isArray(scenario) ? scenario[0] : scenario;
  const activeScenario =
    requestedScenario && PLAN_SCENARIOS.has(requestedScenario as PlanScenario)
      ? (requestedScenario as PlanScenario)
      : 'recent';

  return <PlanScreen model={inMemoryPlanScreenSource.get(activeScenario)} />;
}
