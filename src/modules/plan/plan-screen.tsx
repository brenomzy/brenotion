import { router } from 'expo-router';
import { Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DataConfidence, MoneyValue, ScreenStatePanel } from '@/components/domain';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { BottomTabInset } from '@/constants/theme';
import { type PlanScreenModel, type PlanStep } from './plan-screen-model';

function LoadingPlan() {
  return (
    <View accessibilityLiveRegion="polite" className="gap-4">
      <Text variant="sectionTitle">Preparando o Plano Financeiro</Text>
      <Text variant="caption">
        Organizando a ordem das alocações sem sugerir valores provisórios.
      </Text>
      {[0, 1, 2, 3].map((item) => (
        <View key={item} className="h-24 rounded-card bg-surface-muted" />
      ))}
    </View>
  );
}

function PlanStepCard({ step, readOnly }: { step: PlanStep; readOnly: boolean }) {
  return (
    <Card className="gap-0 py-0">
      <CardContent className="flex-row gap-4 p-4">
        <View className="h-11 w-11 items-center justify-center rounded-control bg-surface-muted">
          <Text variant="label" className="tabular-nums">
            {step.order}
          </Text>
        </View>
        <View className="min-w-0 flex-1 gap-2">
          <View className="flex-row items-start justify-between gap-3">
            <View className="min-w-0 flex-1 gap-0.5">
              <Text variant="overline">{step.scope}</Text>
              <Text variant="label">{step.title}</Text>
            </View>
            {step.amountMinor === null ? (
              <Text variant="caption">Indisponível</Text>
            ) : (
              <MoneyValue minorUnits={step.amountMinor} currency="BRL" size="label" />
            )}
          </View>
          <Text variant="caption">{step.description}</Text>
          <Text variant="caption" className="text-ink">
            {readOnly && step.status === 'pending' ? 'Somente consulta · ' : ''}
            {step.statusLabel}
          </Text>
        </View>
      </CardContent>
    </Card>
  );
}

export function PlanScreen({ model }: { model: PlanScreenModel }) {
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
          <Text variant="screenTitle">Plano Financeiro</Text>
          <Text variant="caption">{model.cycleLabel}</Text>
        </View>

        {model.scenario === 'loading' ? (
          <LoadingPlan />
        ) : (
          <>
            {model.scenario === 'recent' ? (
              <Card>
                <CardHeader>
                  <CardTitle>{model.state.title}</CardTitle>
                  <DataConfidence
                    status="recent"
                    description={model.state.description}
                    referenceLabel={model.asOfLabel}
                  />
                </CardHeader>
                <CardContent>
                  <Button className="w-full">
                    <Text>{model.state.actionLabel}</Text>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <ScreenStatePanel
                state={model.scenario}
                title={model.state.title}
                description={model.state.description}
                referenceLabel={model.asOfLabel}
                actionLabel={model.state.actionLabel!}
                onActionPress={() => {
                  if (model.scenario === 'empty') {
                    router.push('/more');
                  }
                }}
              />
            )}

            <View className="gap-3">
              <View className="gap-1">
                <Text variant="sectionTitle">Cascata do ciclo</Text>
                <Text variant="caption">
                  Ordem determinística · Empresa e Pessoal permanecem separados
                </Text>
              </View>
              {model.steps.map((step) => (
                <PlanStepCard key={step.id} step={step} readOnly={model.readOnly} />
              ))}
            </View>

            {model.showsSnapshot ? (
              <Card className="bg-surface-muted shadow-none">
                <CardContent className="gap-1">
                  <Text variant="label">Ações sempre manuais</Text>
                  <Text variant="caption" className="leading-5 text-ink">
                    O Brenotion organiza o Plano Financeiro, mas não movimenta dinheiro nem
                    confirma pagamentos sem evidência.
                  </Text>
                </CardContent>
              </Card>
            ) : null}
          </>
        )}
      </View>
    </ScrollView>
  );
}
