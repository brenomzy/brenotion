import { router } from 'expo-router';
import { useQuery } from 'convex/react';
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
import {
  buildHomeActivationModel,
  currentHomeCompetence,
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
  const competence = currentHomeCompetence();
  const activation = useQuery(api.homeActivation.get, { competence });
  const financialSnapshot = useQuery(api.financialSnapshot.getCurrent);
  const checklist = useQuery(api.obligationOccurrences.listForCompetence, {
    competence,
  });
  const model = activation ? buildHomeActivationModel(activation) : null;
  const checklistTotal = checklist?.items.length ?? 0;
  const checklistResolved =
    checklist?.items.filter(
      (item) => item.status === 'completed' || item.status === 'waived',
    ).length ?? 0;

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
          <Text variant="overline">Seu mês em um só lugar</Text>
          <Text variant="screenTitle">Visão geral</Text>
          <Text variant="caption" className="leading-5">
            Entenda o mês, acompanhe sua checklist e atualize os dados sem
            lançamentos diários.
          </Text>
        </View>

        {model && financialSnapshot !== undefined && checklist !== undefined ? (
          <ActivationContent
            model={model}
            financialSnapshot={financialSnapshot}
            checklistTotal={checklistTotal}
            checklistResolved={checklistResolved}
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
      <Text variant="sectionTitle">Preparando sua visão geral</Text>
      <Text variant="caption">
        Consultando a atualização mensal e sua checklist.
      </Text>
      <View className="h-44 rounded-card bg-surface-muted" />
      <View className="h-36 rounded-card bg-surface-muted" />
    </View>
  );
}

function ActivationContent({
  model,
  financialSnapshot,
  checklistTotal,
  checklistResolved,
}: {
  model: HomeActivationModel;
  financialSnapshot: CurrentFinancialSnapshot | null;
  checklistTotal: number;
  checklistResolved: number;
}) {
  const checklistDescription =
    checklistTotal === 0
      ? 'Adicione os compromissos que você quer acompanhar neste mês.'
      : `${checklistResolved} de ${checklistTotal} itens resolvidos.`;

  return (
    <View className="gap-6">
      {financialSnapshot ? (
        <Card className="gap-0 py-0">
          <CardHeader className="gap-3 pb-3 pt-5">
            <Text variant="overline">Último cálculo oficial</Text>
            <Text variant="label">Disponível para Gastar</Text>
            <MoneyValue
              minorUnits={
                financialSnapshot.availableToSpend.amountInMinorUnits
              }
              currency="BRL"
              size="display"
              showCents="when-needed"
            />
          </CardHeader>
          <CardContent className="pb-5">
            <DataConfidence
              status={financialSnapshot.confidence}
              title={confidenceTitle(financialSnapshot.confidence)}
              description={confidenceDescription(
                financialSnapshot.confidence,
              )}
              referenceLabel={`Referência: ${formatAsOf(
                new Date(financialSnapshot.asOf).toISOString(),
              )}`}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="gap-2">
            <Text variant="overline">Visibilidade financeira</Text>
            <Text variant="sectionTitle">
              Seu primeiro retrato começa pela atualização mensal
            </Text>
            <Text variant="body" className="leading-6 text-ink-muted">
              O Brenotion ainda não possui um cálculo oficial para mostrar.
              Organize uma competência por vez sem preencher gastos todos os
              dias.
            </Text>
          </CardHeader>
        </Card>
      )}

      <Card className="border border-action-primary/20">
        <CardHeader className="gap-2">
          <Text variant="overline" className="capitalize">
            {model.competenceLabel}
          </Text>
          <Text variant="sectionTitle">{model.nextAction.title}</Text>
          <Text variant="body" className="leading-6 text-ink-muted">
            {model.nextAction.description}
          </Text>
          <Text variant="caption">{model.coverageSummary}</Text>
        </CardHeader>
        <CardContent className="gap-2 sm:flex-row">
          <Button
            onPress={() =>
              router.push({
                pathname: model.nextAction.route,
                params: { competence: model.competence },
              })
            }>
            <Text>{model.nextAction.label}</Text>
          </Button>
          {model.nextAction.route !== '/import' ? (
            <Button
              variant="outline"
              onPress={() =>
                router.push({
                  pathname: '/import',
                  params: { competence: model.competence },
                })
              }>
              <Text>Atualizar mês</Text>
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-2">
          <Text variant="overline">Durante o mês</Text>
          <Text variant="sectionTitle">Checklist mensal</Text>
          <Text variant="body" className="leading-6 text-ink-muted">
            {checklistDescription}
          </Text>
        </CardHeader>
        <CardContent>
          <Button
            variant="secondary"
            onPress={() => router.push('/checklist')}>
            <Text>Abrir checklist</Text>
          </Button>
        </CardContent>
      </Card>

      {model.hasBoundedSearchWarning ? (
        <View className="rounded-card bg-status-warning-soft p-4">
          <Text variant="caption" className="leading-5 text-ink">
            Parte do histórico ficou fora desta visão resumida. Abra a
            atualização mensal para conferir os detalhes.
          </Text>
        </View>
      ) : null}

      <View className="gap-2">
        <Text variant="caption">Detalhes e configurações</Text>
        <View className="flex-row flex-wrap gap-2">
          <Button
            variant="ghost"
            size="compact"
            onPress={() => router.push('/obligations')}>
            <Text>Gerenciar recorrências</Text>
          </Button>
          <Button
            variant="ghost"
            size="compact"
            onPress={() => router.push('/more')}>
            <Text>Configurações</Text>
          </Button>
        </View>
      </View>
    </View>
  );
}

type CurrentFinancialSnapshot = Readonly<{
  availableToSpend: Readonly<{
    amountInMinorUnits: bigint;
    currency: 'BRL';
    minorUnit: 'cent';
  }>;
  asOf: number;
  timeZone: string;
  confidence: 'recent' | 'partial' | 'stale';
  calculationVersion: string;
  updatedAt: number;
}>;

function confidenceTitle(
  confidence: CurrentFinancialSnapshot['confidence'],
): string {
  if (confidence === 'recent') {
    return 'Dados recentes';
  }

  if (confidence === 'partial') {
    return 'Retrato parcial';
  }

  return 'Atualização recomendada';
}

function confidenceDescription(
  confidence: CurrentFinancialSnapshot['confidence'],
): string {
  if (confidence === 'recent') {
    return 'Este valor veio do último cálculo financeiro versionado.';
  }

  if (confidence === 'partial') {
    return 'O cálculo preserva lacunas reconhecidas na competência.';
  }

  return 'Use Atualizar mês antes de tomar uma nova decisão financeira.';
}
