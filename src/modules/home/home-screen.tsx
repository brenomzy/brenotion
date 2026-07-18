import { router } from 'expo-router';
import { Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  DataConfidence,
  MoneyValue,
  ObligationRow,
  ReserveProgress,
  ScreenStatePanel,
} from '@/components/domain';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { BottomTabInset } from '@/constants/theme';
import { formatAsOf, formatDueDate, formatLongDate } from './home-formatters';
import { inMemoryHomeSnapshotSource } from './in-memory-home-snapshot-source';
import { type HomeScenario, type HomeSnapshot } from './home-snapshot-source';
import { useHomeSnapshot } from './use-home-snapshot';

function HomeLoading() {
  return (
    <View accessibilityLiveRegion="polite" className="gap-4">
      <Text variant="sectionTitle">Preparando seu retrato</Text>
      <Text variant="caption">Nenhum valor provisório será exibido.</Text>
      <View className="h-52 rounded-card bg-surface-muted" />
      <View className="h-28 rounded-card bg-surface-muted" />
      <View className="h-28 rounded-card bg-surface-muted" />
    </View>
  );
}

function SnapshotContent({
  snapshot,
  onRetry,
}: {
  snapshot: HomeSnapshot;
  onRetry: () => void;
}) {
  const remoteActionsDisabled = snapshot.confidence.kind === 'offline';
  const primaryAction = {
    recent: { label: 'Ver plano', onPress: () => router.push('/plan') },
    partial: { label: 'Entender a lacuna', onPress: () => router.push('/more') },
    stale: { label: 'Atualizar dados', onPress: onRetry },
    offline: { label: 'Tentar novamente', onPress: onRetry },
    error: { label: 'Tentar novamente', onPress: onRetry },
  }[snapshot.confidence.kind];

  return (
    <View className="gap-6">
      <Card className="gap-0 py-0">
        <CardHeader className="gap-3 pb-3 pt-5">
          <Text variant="label">Disponível para Gastar</Text>
          <MoneyValue
            minorUnits={snapshot.availableToSpend.amount.amountMinor}
            currency="BRL"
            size="display"
            showCents="when-needed"
          />
          <Text variant="body" className="font-sans-medium">
            Até {formatDueDate(snapshot.availableToSpend.horizonDate)}
          </Text>
          <Text variant="caption">
            Próximo recebimento em {snapshot.availableToSpend.horizonDays} dias
          </Text>
        </CardHeader>
        <CardContent className="gap-4 pb-5">
          <DataConfidence
            status={snapshot.confidence.kind}
            title={snapshot.confidence.title}
            description={snapshot.confidence.description}
            referenceLabel={`Referência: ${formatAsOf(snapshot.asOf)}`}
          />
          <View className="flex-row gap-2">
            <Button className="flex-1" onPress={primaryAction.onPress}>
              <Text>{primaryAction.label}</Text>
            </Button>
            <Button variant="secondary" className="flex-1" onPress={() => router.push('/review')}>
              <Text>Revisar</Text>
            </Button>
          </View>
        </CardContent>
      </Card>

      <View className="gap-3">
        <View className="gap-1">
          <Text variant="sectionTitle">Dinheiro protegido</Text>
          <Text variant="caption">Empresa e Pessoal permanecem separados</Text>
        </View>
        <View className="gap-3 sm:flex-row">
          {snapshot.scopes.map((scope) => (
            <ReserveProgress
              key={scope.scope}
              className="flex-1"
              label={scope.reserveLabel}
              scope={scope.scope}
              currentMinorUnits={scope.protectedAmount.amountMinor}
              targetMinorUnits={scope.targetAmount.amountMinor}
              currency="BRL"
              progressPercent={scope.progressPercent}
              progressLabel={scope.progressLabel}
              description={scope.description}
            />
          ))}
        </View>
      </View>

      <View className="gap-3">
        <View className="gap-1">
          <Text variant="sectionTitle">Próxima decisão</Text>
          <Text variant="caption">A Obrigação que precisa de atenção primeiro</Text>
        </View>
        <Card className="gap-0 px-4 py-0">
          <ObligationRow
            title={snapshot.nextObligation.title}
            dueLabel={`Vence em ${formatDueDate(snapshot.nextObligation.dueDate)}`}
            status="pending-evidence"
            scope={snapshot.nextObligation.scope}
            expectedAmountMinorUnits={snapshot.nextObligation.expectedAmount.amountMinor}
            evidenceLabel={snapshot.nextObligation.supportingText}
            actionLabel="Revisar Obrigação"
            onActionPress={() => router.push('/review')}
            actionDisabled={remoteActionsDisabled}
          />
        </Card>
      </View>
    </View>
  );
}

export function HomeScreen({ scenario }: { scenario: HomeScenario }) {
  const insets = useSafeAreaInsets();
  const { state, retry } = useHomeSnapshot(inMemoryHomeSnapshotSource, scenario);

  return (
    <ScrollView
      className="flex-1 bg-canvas"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        paddingTop: Platform.OS === 'web' ? 40 : insets.top + 16,
        paddingBottom: insets.bottom + BottomTabInset + 32,
      }}>
      <View className="w-full max-w-[720px] self-center gap-6 px-5 web:px-8">
        <View className="gap-1">
          <Text variant="overline">Demonstração com dados sintéticos</Text>
          <Text variant="screenTitle">Início</Text>
          <Text variant="caption">
            {state.status === 'ready' ? formatLongDate(state.snapshot.asOf) : 'Seu retrato financeiro'}
          </Text>
        </View>

        {state.status === 'loading' ? <HomeLoading /> : null}
        {state.status === 'empty' ? (
          <ScreenStatePanel
            state="empty"
            title={state.title}
            description={state.description}
            actionLabel="Ver opções de dados"
            onActionPress={() => router.push('/more')}
          />
        ) : null}
        {state.status === 'error' ? (
          <ScreenStatePanel state="error" title={state.title} description={state.description} />
        ) : null}
        {state.status === 'ready' ? (
          <SnapshotContent snapshot={state.snapshot} onRetry={retry} />
        ) : null}
      </View>
    </ScrollView>
  );
}
