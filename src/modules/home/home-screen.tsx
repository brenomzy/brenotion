import { router } from 'expo-router';
import { useQuery } from 'convex/react';
import { useState } from 'react';
import { Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '../../../convex/_generated/api';
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
import { cn } from '@/lib/utils';
import {
  buildHomeActivationModel,
  currentHomeCompetence,
  shiftHomeCompetence,
  type HomeActivationModel,
} from './home-activation-model';
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

export function SyntheticHomeScreen({ scenario }: { scenario: HomeScenario }) {
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

export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [competence, setCompetence] = useState(currentHomeCompetence);
  const activation = useQuery(api.homeActivation.get, { competence });
  const model = activation ? buildHomeActivationModel(activation) : null;

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
          <Text variant="overline">Seu caminho agora</Text>
          <Text variant="screenTitle">Início</Text>
          <Text variant="caption" className="leading-5">
            Dados persistidos, pendências explícitas e nenhuma estimativa
            apresentada como valor oficial.
          </Text>
        </View>

        {model ? (
          <ActivationContent
            model={model}
            onPreviousCompetence={() =>
              setCompetence((current) => shiftHomeCompetence(current, -1))
            }
            onNextCompetence={() =>
              setCompetence((current) => shiftHomeCompetence(current, 1))
            }
          />
        ) : (
          <HomeActivationLoading />
        )}
      </View>
    </ScrollView>
  );
}

function HomeActivationLoading() {
  return (
    <View accessibilityLiveRegion="polite" className="gap-4">
      <Text variant="sectionTitle">Preparando seu caminho</Text>
      <Text variant="caption">
        Consultando entradas, revisão e configurações recorrentes.
      </Text>
      <View className="h-36 rounded-card bg-surface-muted" />
      <View className="h-48 rounded-card bg-surface-muted" />
      <View className="h-40 rounded-card bg-surface-muted" />
    </View>
  );
}

function ActivationContent({
  model,
  onPreviousCompetence,
  onNextCompetence,
}: {
  model: HomeActivationModel;
  onPreviousCompetence: () => void;
  onNextCompetence: () => void;
}) {
  return (
    <View className="gap-6">
      <Card className="gap-4">
        <CardHeader className="gap-3">
          <Text variant="overline">Competência acompanhada</Text>
          <Text variant="sectionTitle" className="capitalize">
            {model.competenceLabel}
          </Text>
          <Text variant="body" className="leading-6 text-ink-muted">
            {model.coverageSummary}
          </Text>
        </CardHeader>
        <CardContent className="flex-row gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onPress={onPreviousCompetence}>
            <Text>Mês anterior</Text>
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onPress={onNextCompetence}>
            <Text>Próximo mês</Text>
          </Button>
        </CardContent>
      </Card>

      <Card className="border border-action-primary/20">
        <CardHeader className="gap-2">
          <Text variant="overline">Próxima ação</Text>
          <Text variant="sectionTitle">{model.nextAction.title}</Text>
          <Text variant="body" className="leading-6 text-ink-muted">
            {model.nextAction.description}
          </Text>
        </CardHeader>
        <CardContent>
          <Button onPress={() => router.push(model.nextAction.route)}>
            <Text>{model.nextAction.label}</Text>
          </Button>
        </CardContent>
      </Card>

      <View className="gap-3">
        <View className="gap-1">
          <Text variant="sectionTitle">Ativação operacional</Text>
          <Text variant="caption" className="leading-5">
            O progresso mostra o que existe. O Fechamento abaixo continua
            parcial enquanto não houver cálculo financeiro oficial.
          </Text>
        </View>
        <Card className="gap-0 py-0">
          {model.steps.map((step, index) => (
            <View
              key={step.id}
              className={cn(
                'gap-2 px-5 py-4',
                index > 0 && 'border-t border-divider',
              )}>
              <View className="flex-row flex-wrap items-center justify-between gap-2">
                <Text variant="label">{step.title}</Text>
                <View
                  className={cn(
                    'rounded-full px-2.5 py-1',
                    step.status === 'done'
                      ? 'bg-status-recent-soft'
                      : step.status === 'attention'
                        ? 'bg-status-warning-soft'
                        : 'bg-surface-muted',
                  )}>
                  <Text variant="caption" className="text-ink">
                    {step.statusLabel}
                  </Text>
                </View>
              </View>
              <Text variant="caption" className="leading-5">
                {step.description}
              </Text>
            </View>
          ))}
        </Card>
      </View>

      <Card>
        <CardHeader className="gap-2">
          <Text variant="overline">Registro parcial da competência</Text>
          <Text variant="sectionTitle">{model.monthlyClosure.title}</Text>
          <Text variant="body" className="leading-6 text-ink-muted">
            {model.monthlyClosure.description}
          </Text>
        </CardHeader>
        <CardContent className="gap-3">
          {model.monthlyClosure.closedAt &&
          model.monthlyClosure.revisionLabel ? (
            <View className="rounded-control bg-status-warning-soft px-4 py-3">
              <Text variant="label">{model.monthlyClosure.revisionLabel}</Text>
              <Text variant="caption" className="mt-1 text-ink">
                Registrada em{' '}
                {formatAsOf(
                  new Date(model.monthlyClosure.closedAt).toISOString(),
                )}
              </Text>
            </View>
          ) : null}
          <Button
            variant="secondary"
            className="w-full"
            onPress={() => router.push('/close')}>
            <Text>
              {model.monthlyClosure.status === 'closed'
                ? 'Ver Fechamento'
                : 'Preparar Fechamento'}
            </Text>
          </Button>
        </CardContent>
      </Card>

      <View className="gap-3">
        <View className="gap-1">
          <Text variant="sectionTitle">Entradas do mês</Text>
          <Text variant="caption">
            Patrimônio de Origem permanece explícito em cada lote.
          </Text>
        </View>
        <View className="gap-3 sm:flex-row">
          {model.sources.map((source) => (
            <Card key={source.id} className="flex-1 gap-2 py-4 shadow-none">
              <CardHeader className="gap-1">
                <Text variant="label">{source.title}</Text>
                <Text
                  variant="caption"
                  className={cn(
                    source.status === 'confirmed'
                      ? 'text-status-recent'
                      : 'text-ink',
                  )}>
                  {source.statusLabel}
                </Text>
              </CardHeader>
              <CardContent>
                <Text variant="caption" className="leading-5">
                  {source.description}
                </Text>
              </CardContent>
            </Card>
          ))}
        </View>
      </View>

      <ScreenStatePanel
        state={model.officialSnapshot.asOf ? 'partial' : 'empty'}
        title={model.officialSnapshot.title}
        description={model.officialSnapshot.description}
        referenceLabel={
          model.officialSnapshot.asOf
            ? `Referência: ${formatAsOf(
                new Date(model.officialSnapshot.asOf).toISOString(),
              )}`
            : undefined
        }
      />

      {model.hasBoundedSearchWarning ? (
        <View className="rounded-card bg-status-warning-soft p-4">
          <Text variant="caption" className="leading-5 text-ink">
            O histórico excede a janela operacional desta tela. Os números
            exibidos são mínimos confirmados, não totais completos.
          </Text>
        </View>
      ) : null}
    </View>
  );
}
