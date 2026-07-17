import { useAction } from 'convex/react';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

import { api } from '../../../convex/_generated/api';
import {
  type ConnectionInspectionPresentation,
  presentConnectionInspection,
} from './connection-inspection-presenter';

type InspectionState =
  | Readonly<{ status: 'idle' }>
  | Readonly<{ status: 'loading' }>
  | Readonly<{ status: 'success'; presentation: ConnectionInspectionPresentation }>
  | Readonly<{ status: 'error' }>;

export function ConnectionInspectionCard() {
  const inspectConnection = useAction(api.financialIntegration.inspectConnection);
  const [inspection, setInspection] = useState<InspectionState>({ status: 'idle' });

  const handleInspection = async () => {
    setInspection({ status: 'loading' });

    try {
      const result = await inspectConnection({});
      setInspection({
        status: 'success',
        presentation: presentConnectionInspection(result),
      });
    } catch {
      setInspection({ status: 'error' });
    }
  };

  const buttonLabel =
    inspection.status === 'loading'
      ? 'Verificando…'
      : inspection.status === 'success'
        ? 'Verificar novamente'
        : inspection.status === 'error'
          ? 'Tentar novamente'
          : 'Verificar conexão';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conexão financeira</CardTitle>
        <CardDescription className="text-body leading-6">
          Confira a cobertura e a recência da conexão somente leitura. Nada desta verificação é
          salvo.
        </CardDescription>
      </CardHeader>
      <CardContent className="gap-4">
        {inspection.status === 'success' ? (
          <InspectionResult presentation={inspection.presentation} />
        ) : null}

        {inspection.status === 'error' ? (
          <View accessibilityLiveRegion="polite" className="rounded-control bg-status-danger-soft p-4">
            <Text variant="label">Não foi possível verificar a conexão</Text>
            <Text variant="caption" className="mt-1 leading-5 text-ink">
              A conexão pode estar temporariamente indisponível. Nenhum dado foi alterado.
            </Text>
          </View>
        ) : null}

        <Button disabled={inspection.status === 'loading'} onPress={handleInspection}>
          <Text>{buttonLabel}</Text>
        </Button>
      </CardContent>
    </Card>
  );
}

function InspectionResult({
  presentation,
}: Readonly<{ presentation: ConnectionInspectionPresentation }>) {
  const toneClassName = {
    success: 'bg-status-recent-soft',
    warning: 'bg-status-warning-soft',
    neutral: 'bg-surface-muted',
  }[presentation.tone];

  return (
    <View
      accessibilityLiveRegion="polite"
      className={cn('gap-4 rounded-control p-4', toneClassName)}>
      <View className="gap-1">
        <Text variant="label">{presentation.title}</Text>
        <Text variant="caption" className="leading-5 text-ink">
          {presentation.description}
        </Text>
      </View>

      <View className="gap-3">
        <ResultRow label="Conector" value={presentation.connectorLabel} />
        <ResultRow label="Última atualização" value={presentation.lastUpdatedLabel} />
      </View>

      <Text variant="caption" className="leading-5 text-ink">
        {presentation.coverageLabel}
      </Text>
    </View>
  );
}

function ResultRow({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <View className="flex-row items-start justify-between gap-4">
      <Text variant="caption">{label}</Text>
      <Text variant="label" className="shrink text-right">
        {value}
      </Text>
    </View>
  );
}
