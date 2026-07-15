import { useLocalSearchParams } from 'expo-router';

import { HomeScreen } from '@/modules/home/home-screen';
import { type HomeScenario } from '@/modules/home/home-snapshot-source';

const HOME_SCENARIOS = new Set<HomeScenario>(['recent', 'partial', 'stale', 'empty', 'error']);

export default function HomeRoute() {
  const { scenario } = useLocalSearchParams<{ scenario?: string | string[] }>();
  const requestedScenario = Array.isArray(scenario) ? scenario[0] : scenario;
  const activeScenario =
    requestedScenario && HOME_SCENARIOS.has(requestedScenario as HomeScenario)
      ? (requestedScenario as HomeScenario)
      : 'recent';

  return <HomeScreen scenario={activeScenario} />;
}
