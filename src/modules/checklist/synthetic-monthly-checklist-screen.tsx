import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { BottomTabInset } from '@/constants/theme';
import { cn } from '@/lib/utils';
import { buildMonthlyChecklistProgress } from './monthly-checklist-model';
import {
  actionsForSyntheticChecklistStatus,
  applySyntheticChecklistAction,
  SYNTHETIC_CHECKLIST_ITEMS,
  type SyntheticChecklistAction,
  type SyntheticChecklistItem,
} from './synthetic-monthly-checklist-model';

export function SyntheticMonthlyChecklistScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<readonly SyntheticChecklistItem[]>(
    SYNTHETIC_CHECKLIST_ITEMS,
  );
  const progress = useMemo(() => buildMonthlyChecklistProgress(items), [items]);

  const runAction = (
    itemId: string,
    action: SyntheticChecklistAction,
  ) => {
    setItems((current) =>
      current.map((item) =>
        item.id === itemId
          ? applySyntheticChecklistAction(item, action)
          : item,
      ),
    );
  };

  return (
    <ScrollView
      className="flex-1 bg-canvas"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        paddingTop: Platform.OS === 'web' ? 40 : insets.top + 16,
        paddingBottom: insets.bottom + BottomTabInset + 32,
      }}>
      <View className="w-full max-w-[720px] self-center gap-6 px-5 web:px-8">
        <View className="gap-4">
          <View className="gap-1">
            <Text variant="overline">Demonstração com dados sintéticos</Text>
            <Text variant="screenTitle">Checklist</Text>
            <Text variant="caption" className="leading-5">
              Experimente concluir, retirar do mês e reabrir itens. Nada nesta
              tela é salvo.
            </Text>
          </View>

          <View className="flex-row flex-wrap gap-2">
            <Button
              variant="outline"
              size="compact"
              onPress={() => router.replace('/checklist')}>
              <Text>Voltar aos meus dados</Text>
            </Button>
            <Button
              variant="ghost"
              size="compact"
              onPress={() =>
                router.push({
                  pathname: '/obligations',
                  params: { scenario: 'demo' },
                })
              }>
              <Text>Ver recorrências que geraram a lista</Text>
            </Button>
          </View>
        </View>

        <Card className="border border-action-primary/20">
          <CardHeader className="gap-2">
            <Text variant="overline">Julho de 2026</Text>
            <CardTitle>{progress.label}</CardTitle>
          </CardHeader>
          <CardContent className="gap-2">
            <View
              accessible
              accessibilityLabel={`${progress.label}, ${progress.percentage}%`}
              className="h-2 overflow-hidden rounded-full bg-surface-muted">
              <View
                className="h-full rounded-full bg-action-primary"
                style={{ width: `${progress.percentage}%` }}
              />
            </View>
            <Text variant="caption">
              {progress.remaining === 0
                ? 'Tudo resolvido nesta demonstração.'
                : `${progress.remaining} ${
                    progress.remaining === 1
                      ? 'item ainda precisa'
                      : 'itens ainda precisam'
                  } de decisão.`}
            </Text>
          </CardContent>
        </Card>

        <Card className="gap-0 py-0">
          {items.map((item, index) => (
            <SyntheticChecklistRow
              key={item.id}
              item={item}
              isFirst={index === 0}
              onAction={(action) => runAction(item.id, action)}
            />
          ))}
        </Card>

        <Card>
          <CardHeader className="gap-2">
            <Text variant="overline">O que acontece depois</Text>
            <CardTitle>Conclusão informada não é pagamento comprovado</CardTitle>
            <Text variant="body" className="leading-6 text-ink-muted">
              Ao Atualizar o próximo mês, o Brenotion procura o débito
              correspondente. Só a conciliação produz um Pagamento
              Identificado.
            </Text>
          </CardHeader>
        </Card>
      </View>
    </ScrollView>
  );
}

function SyntheticChecklistRow({
  item,
  isFirst,
  onAction,
}: {
  item: SyntheticChecklistItem;
  isFirst: boolean;
  onAction: (action: SyntheticChecklistAction) => void;
}) {
  const resolved = item.status === 'completed' || item.status === 'waived';

  return (
    <View
      className={cn(
        'gap-4 px-5 py-4',
        !isFirst && 'border-t border-divider',
        resolved && 'opacity-70',
      )}>
      <View className="gap-2">
        <View className="flex-row flex-wrap items-start justify-between gap-2">
          <Text
            variant="label"
            className={cn(
              'min-w-0 flex-1 leading-5',
              resolved && 'line-through',
            )}>
            {item.name}
          </Text>
          <View
            className={cn(
              'rounded-full px-2.5 py-1',
              item.status === 'completed'
                ? 'bg-status-recent-soft'
                : item.status === 'needsAttention'
                  ? 'bg-status-warning-soft'
                  : 'bg-surface-muted',
            )}>
            <Text variant="caption" className="text-ink">
              {statusLabel(item.status)}
            </Text>
          </View>
        </View>

        <View className="flex-row flex-wrap gap-x-3 gap-y-1">
          <Text variant="caption">{item.dueLabel}</Text>
          <Text variant="caption" className="tabular-nums text-ink">
            {item.expectedAmountLabel}
          </Text>
        </View>
        <Text variant="caption">
          Natureza {item.economicNatureLabel} · paga por{' '}
          {item.paymentOriginLabel}
        </Text>
      </View>

      <View className="flex-row flex-wrap gap-2">
        {actionsForSyntheticChecklistStatus(item.status).map((action) => (
          <Button
            key={action}
            variant={action === 'complete' ? 'primary' : 'outline'}
            size="compact"
            onPress={() => onAction(action)}>
            <Text>{actionLabel(action)}</Text>
          </Button>
        ))}
      </View>
    </View>
  );
}

function statusLabel(status: SyntheticChecklistItem['status']): string {
  if (status === 'needsAttention') {
    return 'Precisa de atenção';
  }

  if (status === 'completed') {
    return 'Concluído';
  }

  if (status === 'waived') {
    return 'Não neste mês';
  }

  return 'Pendente';
}

function actionLabel(action: SyntheticChecklistAction): string {
  if (action === 'complete') {
    return 'Concluir';
  }

  if (action === 'waive') {
    return 'Não neste mês';
  }

  return 'Reabrir';
}

