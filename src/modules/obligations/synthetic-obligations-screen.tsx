import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { BottomTabInset } from '@/constants/theme';
import { cn } from '@/lib/utils';
import { SYNTHETIC_CHECKLIST_ITEMS } from '@/modules/checklist/synthetic-monthly-checklist-model';

const SYNTHETIC_RECURRENCES = SYNTHETIC_CHECKLIST_ITEMS.filter(
  (item) => item.id !== 'synthetic-certificate',
);

export function SyntheticObligationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedId, setSelectedId] = useState<string>(
    'synthetic-card',
  );
  const selected =
    SYNTHETIC_RECURRENCES.find((item) => item.id === selectedId) ??
    SYNTHETIC_RECURRENCES[0];

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
            <Text variant="screenTitle">Recorrências</Text>
            <Text variant="caption" className="leading-5">
              Esta é a base que gera a Checklist de cada mês. Nada nesta tela é
              salvo.
            </Text>
          </View>

          <View className="flex-row flex-wrap gap-2">
            <Button
              variant="outline"
              size="compact"
              onPress={() =>
                router.replace({
                  pathname: '/checklist',
                  params: { scenario: 'demo' },
                })
              }>
              <Text>Ver checklist gerada</Text>
            </Button>
            <Button
              variant="ghost"
              size="compact"
              onPress={() => router.replace('/obligations')}>
              <Text>Voltar aos meus dados</Text>
            </Button>
          </View>
        </View>

        <Card className="border border-action-primary/20">
          <CardHeader className="gap-2">
            <Text variant="overline">Fluxo</Text>
            <CardTitle>Configure uma vez, decida a cada mês</CardTitle>
          </CardHeader>
          <CardContent className="gap-3">
            <FlowStep
              number="1"
              title="Recorrência"
              description="Nome, vencimento, valor esperado, Natureza Econômica e conta que costuma pagar."
            />
            <FlowStep
              number="2"
              title="Checklist mensal"
              description="Um novo item é preparado automaticamente sem duplicar a configuração."
            />
            <FlowStep
              number="3"
              title="Conciliação posterior"
              description="A próxima importação pode comprovar o pagamento que você informou como concluído."
            />
          </CardContent>
        </Card>

        <View className="gap-2">
          <Text variant="overline">Base recorrente sintética</Text>
          <Text variant="sectionTitle">Itens dos próximos meses</Text>
        </View>

        <Card className="gap-0 py-0">
          {SYNTHETIC_RECURRENCES.map((item, index) => {
            const isSelected = item.id === selected.id;

            return (
              <View
                key={item.id}
                className={cn(
                  'gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between',
                  index > 0 && 'border-t border-divider',
                  isSelected && 'bg-action-primary-soft',
                )}>
                <View className="min-w-0 flex-1 gap-1">
                  <Text variant="label" className="text-body">
                    {item.name}
                  </Text>
                  <View className="flex-row flex-wrap gap-x-3 gap-y-1">
                    <Text variant="caption">{item.dueLabel}</Text>
                    <Text variant="caption" className="tabular-nums text-ink">
                      {item.expectedAmountLabel}
                    </Text>
                  </View>
                </View>
                <Button
                  variant={isSelected ? 'secondary' : 'outline'}
                  size="compact"
                  onPress={() => setSelectedId(item.id)}>
                  <Text>{isSelected ? 'Em detalhe' : 'Ver configuração'}</Text>
                </Button>
              </View>
            );
          })}
        </Card>

        <Card>
          <CardHeader className="gap-2">
            <Text variant="overline">Configuração selecionada</Text>
            <CardTitle>{selected.name}</CardTitle>
          </CardHeader>
          <CardContent className="gap-2">
            <DetailRow label="Valor esperado" value={selected.expectedAmountLabel} />
            <DetailRow label="Vencimento" value={selected.dueLabel} />
            <DetailRow
              label="Natureza Econômica"
              value={selected.economicNatureLabel}
            />
            <DetailRow
              label="Origem pagadora habitual"
              value={selected.paymentOriginLabel}
            />
            {selected.economicNatureLabel !== selected.paymentOriginLabel ? (
              <Text
                variant="caption"
                className="mt-2 rounded-control bg-status-warning-soft px-3 py-2 leading-5 text-ink">
                Este exemplo mostra por que Natureza Econômica e conta pagadora
                continuam separadas.
              </Text>
            ) : null}
          </CardContent>
        </Card>
      </View>
    </ScrollView>
  );
}

function FlowStep({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <View className="flex-row gap-3">
      <View className="size-7 items-center justify-center rounded-full bg-action-primary">
        <Text variant="caption" className="font-sans-bold text-ink-on-action">
          {number}
        </Text>
      </View>
      <View className="min-w-0 flex-1 gap-1">
        <Text variant="label">{title}</Text>
        <Text variant="caption" className="leading-5">
          {description}
        </Text>
      </View>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row flex-wrap items-center justify-between gap-2 border-b border-divider py-2 last:border-b-0">
      <Text variant="caption">{label}</Text>
      <Text variant="label">{value}</Text>
    </View>
  );
}
