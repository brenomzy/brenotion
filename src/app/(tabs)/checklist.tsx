import { useLocalSearchParams } from 'expo-router';

import { MonthlyChecklistScreen } from '@/modules/checklist/monthly-checklist-screen';
import { SyntheticMonthlyChecklistScreen } from '@/modules/checklist/synthetic-monthly-checklist-screen';

export default function ChecklistRoute() {
  const { scenario } = useLocalSearchParams<{
    scenario?: string | string[];
  }>();
  const requestedScenario = Array.isArray(scenario) ? scenario[0] : scenario;

  return requestedScenario === 'demo' ? (
    <SyntheticMonthlyChecklistScreen />
  ) : (
    <MonthlyChecklistScreen />
  );
}
