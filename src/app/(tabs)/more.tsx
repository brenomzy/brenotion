import { useLocalSearchParams } from 'expo-router';

import { inMemoryMoreScreenSource } from '@/modules/more/in-memory-more-screen-source';
import { MoreScreen, SyntheticMoreScreen } from '@/modules/more/more-screen';
import { type MoreScenario } from '@/modules/more/more-screen-model';

const MORE_SCENARIOS = new Set<MoreScenario>([
  'loading',
  'empty',
  'recent',
  'partial',
  'stale',
  'offline',
  'error',
]);

export default function MoreRoute() {
  const { scenario } = useLocalSearchParams<{ scenario?: string | string[] }>();
  const requestedScenario = Array.isArray(scenario) ? scenario[0] : scenario;
  const activeScenario =
    requestedScenario && MORE_SCENARIOS.has(requestedScenario as MoreScenario)
      ? (requestedScenario as MoreScenario)
      : null;

  return activeScenario ? (
    <SyntheticMoreScreen model={inMemoryMoreScreenSource.get(activeScenario)} />
  ) : (
    <MoreScreen />
  );
}
