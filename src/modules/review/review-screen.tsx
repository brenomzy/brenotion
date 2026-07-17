import { router } from 'expo-router';
import { Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DataConfidence, ScreenStatePanel } from '@/components/domain';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { BottomTabInset } from '@/constants/theme';
import { type ReviewAction, type ReviewScreenModel } from './review-screen-model';

function ReviewLoading() {
  return (
    <View accessibilityLiveRegion="polite" className="gap-4">
      <Text variant="sectionTitle">Preparando sua revisão</Text>
      <Text variant="caption">Reunindo pendências sem mostrar uma contagem provisória.</Text>
      <View className="h-20 rounded-card bg-surface-muted" />
      <View className="h-28 rounded-card bg-surface-muted" />
      <View className="h-28 rounded-card bg-surface-muted" />
    </View>
  );
}

function ReviewActionCard({ action }: { action: ReviewAction }) {
  return (
    <Card className="gap-0 py-0">
      <CardHeader className="gap-1 pb-3 pt-4">
        <Text variant="overline">{action.scope}</Text>
        <CardTitle>{action.title}</CardTitle>
        <Text variant="caption" className="leading-5">
          {action.description}
        </Text>
      </CardHeader>
      <CardFooter className="pb-4">
        <Button variant="secondary" className="w-full" disabled={!action.enabled}>
          <Text>{action.enabled ? action.actionLabel : 'Disponível após atualizar'}</Text>
        </Button>
      </CardFooter>
    </Card>
  );
}

export function ReviewScreen({ model }: { model: ReviewScreenModel }) {
  const insets = useSafeAreaInsets();

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
          <Text variant="screenTitle">Revisar</Text>
          <Text variant="caption">{model.periodLabel} · Empresa e Pessoal</Text>
        </View>

        {model.scenario === 'loading' ? (
          <ReviewLoading />
        ) : (
          <>
            {model.scenario === 'recent' ? (
              <Card>
                <CardHeader>
                  <CardTitle>{model.state.title}</CardTitle>
                  <DataConfidence
                    status="recent"
                    description={model.state.description}
                    referenceLabel={model.periodLabel}
                  />
                </CardHeader>
                <CardContent className="gap-2">
                  <View className="flex-row items-center justify-between">
                    <Text variant="caption">Progresso confirmado</Text>
                    <Text variant="label" className="tabular-nums">
                      {model.completedCount} de {model.totalCount}
                    </Text>
                  </View>
                  <View className="h-2 overflow-hidden rounded-full bg-surface-muted">
                    <View
                      className="h-full rounded-full bg-ink"
                      style={{ width: `${model.progressPercent}%` }}
                    />
                  </View>
                </CardContent>
                <CardFooter>
                  <Button className="w-full">
                    <Text>{model.state.actionLabel}</Text>
                  </Button>
                </CardFooter>
              </Card>
            ) : (
              <ScreenStatePanel
                state={model.scenario}
                title={model.state.title}
                description={model.state.description}
                referenceLabel={model.periodLabel}
                actionLabel={model.state.actionLabel!}
                onActionPress={() => {
                  if (model.scenario === 'empty') {
                    router.push('/');
                  }
                }}
                secondaryAction={
                  model.scenario === 'uncertain' ? (
                    <Button variant="outline" className="w-full">
                      <Text>Corrigir</Text>
                    </Button>
                  ) : undefined
                }
              />
            )}

            {model.scenario !== 'recent' && model.scenario !== 'empty' ? (
              <Card>
                <CardContent className="gap-2 py-5">
                  <View className="flex-row items-center justify-between">
                    <Text variant="caption">Progresso confirmado</Text>
                    <Text variant="label" className="tabular-nums">
                      {model.completedCount} de {model.totalCount}
                    </Text>
                  </View>
                  <View className="h-2 overflow-hidden rounded-full bg-surface-muted">
                    <View
                      className="h-full rounded-full bg-ink"
                      style={{ width: `${model.progressPercent}%` }}
                    />
                  </View>
                </CardContent>
              </Card>
            ) : null}

            {model.showsSnapshot ? (
              <View className="gap-3">
                <View className="gap-1">
                  <Text variant="sectionTitle">
                    {model.actions.length} {model.actions.length === 1 ? 'ação' : 'ações'} para agora
                  </Text>
                  <Text variant="caption">Até três ações, ordenadas por impacto demonstrativo</Text>
                </View>
                {model.actions.map((action) => (
                  <ReviewActionCard key={action.id} action={action} />
                ))}
              </View>
            ) : null}
          </>
        )}
      </View>
    </ScrollView>
  );
}
