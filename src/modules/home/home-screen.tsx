import { SymbolView } from 'expo-symbols';
import { router } from 'expo-router';
import { ActivityIndicator, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { BottomTabInset, Colors } from '@/constants/theme';
import {
  formatAsOf,
  formatDueDate,
  formatLongDate,
  formatMoney,
} from '@/modules/home/home-formatters';
import { inMemoryHomeSnapshotSource } from '@/modules/home/in-memory-home-snapshot-source';
import {
  type HomeScenario,
  type HomeSnapshot,
  type MoneyScope,
  type SnapshotConfidence,
} from '@/modules/home/home-snapshot-source';
import { useHomeSnapshot } from '@/modules/home/use-home-snapshot';

const CONFIDENCE_STYLES = {
  recent: {
    icon: 'bg-ink',
    iconColor: '#FFFFFF',
    symbol: { ios: 'checkmark', android: 'check', web: 'check' },
  },
  partial: {
    icon: 'border border-divider bg-surface',
    iconColor: Colors.light.text,
    symbol: { ios: 'exclamationmark', android: 'priority_high', web: 'priority_high' },
  },
  stale: {
    icon: 'bg-ink',
    iconColor: '#FFFFFF',
    symbol: { ios: 'arrow.clockwise', android: 'history', web: 'history' },
  },
} as const;

const SCOPE_SYMBOLS = {
  company: { ios: 'building.2', android: 'business', web: 'business' },
  personal: { ios: 'person', android: 'person', web: 'person' },
} as const;

function ConfidenceNotice({ confidence, asOf }: { confidence: SnapshotConfidence; asOf: string }) {
  const styles = CONFIDENCE_STYLES[confidence.kind];

  return (
    <View
      accessibilityLabel={`${confidence.title}. ${confidence.description} Referência: ${formatAsOf(asOf)}.`}
      className="flex-row items-start gap-3">
      <View
        aria-hidden
        importantForAccessibility="no-hide-descendants"
        className={`h-9 w-9 shrink-0 items-center justify-center rounded-full ${styles.icon}`}>
        <SymbolView aria-hidden name={styles.symbol} size={18} tintColor={styles.iconColor} />
      </View>
      <View className="min-w-0 flex-1 gap-0.5">
        <Text variant="label">{confidence.title}</Text>
        <Text variant="caption" className="text-ink">
          {confidence.description}
        </Text>
        <Text variant="caption">Referência: {formatAsOf(asOf)}</Text>
      </View>
    </View>
  );
}

function ScopeIcon({ scope }: { scope: MoneyScope }) {
  return (
    <View
      aria-hidden
      importantForAccessibility="no-hide-descendants"
      className="h-11 w-11 shrink-0 items-center justify-center rounded-control bg-surface-muted">
      <SymbolView aria-hidden name={SCOPE_SYMBOLS[scope]} size={20} tintColor={Colors.light.text} />
    </View>
  );
}

function AvailableToSpendCard({ snapshot }: { snapshot: HomeSnapshot }) {
  return (
    <Card
      accessibilityLabel="Resumo do Disponível para Gastar"
      className="gap-0 overflow-hidden border border-divider bg-surface py-0 shadow-none">
      <CardHeader className="gap-4 pb-3 pt-5">
        <View className="flex-row flex-wrap items-center justify-between gap-2">
          <Text variant="label">Disponível para Gastar</Text>
          <View className="rounded-full border border-divider bg-surface-muted px-3 py-1">
            <Text variant="caption" className="font-semibold text-ink">
              {snapshot.origin.label}
            </Text>
          </View>
        </View>
      </CardHeader>

      <CardContent className="gap-1 pb-5">
        <Text variant="money">{formatMoney(snapshot.availableToSpend.amount)}</Text>
        <Text variant="body" className="font-medium text-ink">
          Até {formatDueDate(snapshot.availableToSpend.horizonDate)}
        </Text>
        <Text variant="caption">
          Próximo recebimento em {snapshot.availableToSpend.horizonDays} dias
        </Text>
      </CardContent>

      <CardContent className="flex-row gap-2 pb-5">
        <Button className="flex-1 rounded-full" onPress={() => router.push('/plan')}>
          <Text>Ver plano</Text>
        </Button>
        <Button
          variant="secondary"
          className="flex-1 rounded-full"
          onPress={() => router.push('/review')}>
          <Text>Revisar</Text>
        </Button>
      </CardContent>

      <View className="border-t border-divider bg-surface-muted px-5 py-4">
        <ConfidenceNotice confidence={snapshot.confidence} asOf={snapshot.asOf} />
      </View>
    </Card>
  );
}

function ScopeCards({ snapshot }: { snapshot: HomeSnapshot }) {
  return (
    <View className="gap-3 sm:flex-row">
      {snapshot.scopes.map((scope) => (
        <Card
          key={scope.scope}
          className="flex-1 gap-0 border border-divider bg-surface py-0 shadow-none">
          <CardContent className="flex-row items-center gap-3 p-4">
            <ScopeIcon scope={scope.scope} />
            <View className="min-w-0 flex-1 gap-0.5">
              <Text variant="label">{scope.label}</Text>
              <Text variant="caption">{scope.description}</Text>
            </View>
            <Text className="shrink-0 text-label font-bold tabular-nums">
              {formatMoney(scope.protectedAmount)}
            </Text>
          </CardContent>
        </Card>
      ))}
    </View>
  );
}

function NextObligationCard({ snapshot }: { snapshot: HomeSnapshot }) {
  const obligation = snapshot.nextObligation;

  return (
    <Card className="gap-0 border border-divider bg-surface py-0 shadow-none">
      <CardContent className="gap-4 p-4">
        <View className="flex-row items-start gap-3">
          <View
            aria-hidden
            importantForAccessibility="no-hide-descendants"
            className="h-11 w-11 shrink-0 items-center justify-center rounded-control bg-surface-muted">
            <SymbolView
              aria-hidden
              name={{ ios: 'calendar', android: 'calendar_today', web: 'calendar_today' }}
              size={20}
              tintColor={Colors.light.text}
            />
          </View>
          <View className="min-w-0 flex-1 gap-1">
            <View className="flex-row items-start justify-between gap-3">
              <View className="min-w-0 flex-1 gap-0.5">
                <Text variant="label">{obligation.title}</Text>
                <Text variant="caption">
                  {obligation.scope === 'personal' ? 'Pessoal' : 'Empresa'} · Vence em{' '}
                  {formatDueDate(obligation.dueDate)}
                </Text>
              </View>
              <Text className="shrink-0 text-label font-bold tabular-nums">
                {formatMoney(obligation.expectedAmount)}
              </Text>
            </View>
            <Text variant="caption" className="text-ink">
              {obligation.supportingText}
            </Text>
          </View>
        </View>
      </CardContent>
      <CardFooter className="border-t border-divider px-4 py-3">
        <Button
          variant="ghost"
          size="compact"
          className="w-full rounded-full"
          onPress={() => router.push('/review')}>
          <Text>Revisar obrigação</Text>
        </Button>
      </CardFooter>
    </Card>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <Card className="mt-8 border border-divider shadow-none">
      <CardHeader>
        <View className="mb-2 h-11 w-11 items-center justify-center rounded-control bg-surface-muted">
          <Text className="text-title-section font-bold">+</Text>
        </View>
        <CardTitle>{title}</CardTitle>
        <Text variant="body" className="text-ink-muted">
          {description}
        </Text>
      </CardHeader>
      <CardFooter>
        <Button className="w-full rounded-full" onPress={() => router.push('/more')}>
          <Text>Preparar fontes</Text>
        </Button>
      </CardFooter>
    </Card>
  );
}

function ErrorState({
  title,
  description,
  onRetry,
}: {
  title: string;
  description: string;
  onRetry: () => void;
}) {
  return (
    <Card className="mt-8 border border-divider shadow-none">
      <CardHeader>
        <View className="mb-2 h-11 w-11 items-center justify-center rounded-control bg-ink">
          <Text className="text-title-section font-bold text-white">!</Text>
        </View>
        <CardTitle>{title}</CardTitle>
        <Text variant="body" className="text-ink-muted">
          {description}
        </Text>
      </CardHeader>
      <CardFooter>
        <Button className="w-full rounded-full" onPress={onRetry}>
          <Text>Tentar novamente</Text>
        </Button>
      </CardFooter>
    </Card>
  );
}

export function HomeScreen({ scenario }: { scenario: HomeScenario }) {
  const insets = useSafeAreaInsets();
  const { state, retry } = useHomeSnapshot(inMemoryHomeSnapshotSource, scenario);
  const topInset = Platform.OS === 'web' ? 40 : insets.top + 16;
  const bottomInset = insets.bottom + BottomTabInset + 32;

  return (
    <ScrollView
      className="flex-1 bg-canvas"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingTop: topInset, paddingBottom: bottomInset }}>
      <View className="w-full max-w-[720px] self-center px-5 web:px-8">
        <View className="mb-7 gap-1">
          <Text variant="screenTitle">Início</Text>
          <Text variant="caption">
            {state.status === 'ready'
              ? formatLongDate(state.snapshot.asOf)
              : 'Seu retrato financeiro'}
          </Text>
        </View>

        {state.status === 'loading' && (
          <View
            accessibilityLiveRegion="polite"
            className="min-h-[320px] items-center justify-center gap-3">
            <ActivityIndicator accessibilityLabel="Carregando retrato sintético" color={Colors.light.text} />
            <Text variant="caption">Carregando retrato sintético…</Text>
          </View>
        )}

        {state.status === 'empty' && (
          <EmptyState title={state.title} description={state.description} />
        )}

        {state.status === 'error' && (
          <ErrorState title={state.title} description={state.description} onRetry={retry} />
        )}

        {state.status === 'ready' && (
          <View className="gap-7">
            <View className="flex-row items-start gap-2 rounded-control border border-divider bg-surface px-3 py-3">
              <View aria-hidden importantForAccessibility="no-hide-descendants" className="pt-0.5">
                <SymbolView
                  aria-hidden
                  name={{ ios: 'info.circle', android: 'info', web: 'info' }}
                  size={16}
                  tintColor={Colors.light.textSecondary}
                />
              </View>
              <Text variant="caption" className="min-w-0 flex-1 text-ink">
                {state.snapshot.origin.disclosure}
              </Text>
            </View>

            <AvailableToSpendCard snapshot={state.snapshot} />

            <View className="gap-3">
              <View className="gap-0.5">
                <Text variant="sectionTitle">Dinheiro protegido</Text>
                <Text variant="caption">Separado entre Empresa e Pessoal</Text>
              </View>
              <ScopeCards snapshot={state.snapshot} />
            </View>

            <View className="gap-3">
              <View className="gap-0.5">
                <Text variant="sectionTitle">Próxima decisão</Text>
                <Text variant="caption">A obrigação que precisa de atenção primeiro</Text>
              </View>
              <NextObligationCard snapshot={state.snapshot} />
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
