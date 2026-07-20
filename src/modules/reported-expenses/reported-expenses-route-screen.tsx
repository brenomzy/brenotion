import { ReportedExpensesScreen } from './reported-expenses-screen';
import { useReportedExpensesSource } from './use-reported-expenses-source';

export function ReportedExpensesRouteScreen() {
  const source = useReportedExpensesSource();
  return <ReportedExpensesScreen source={source} />;
}
