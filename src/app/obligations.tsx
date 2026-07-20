import { useLocalSearchParams } from 'expo-router';

import { ObligationsScreen } from '@/modules/obligations/obligations-screen';
import { SyntheticObligationsScreen } from '@/modules/obligations/synthetic-obligations-screen';

export default function ObligationsRoute() {
  const { scenario } = useLocalSearchParams<{
    scenario?: string | string[];
  }>();
  const requestedScenario = Array.isArray(scenario) ? scenario[0] : scenario;

  return requestedScenario === 'demo' ? (
    <SyntheticObligationsScreen />
  ) : (
    <ObligationsScreen />
  );
}
