import { useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '../../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { BottomTabInset } from '@/constants/theme';
import { cn } from '@/lib/utils';
import {
  currentOccurrenceCompetence,
  formatOccurrenceCompetence,
  shiftOccurrenceCompetence,
  type ObligationOccurrenceListItem,
} from '@/modules/obligations/obligation-occurrences-presentation-model';
import { useObligationOccurrencesSource } from '@/modules/obligations/use-obligation-occurrences-source';
import {
  actionsForChecklistStatus,
  buildMonthlyChecklistProgress,
  type MonthlyChecklistAction,
} from './monthly-checklist-model';

type SubmissionState =
  | Readonly<{ status: 'idle' }>
  | Readonly<{ status: 'materializing' }>
  | Readonly<{ status: 'changing'; operationKey: string }>
  | Readonly<{ status: 'success'; message: string }>
  | Readonly<{ status: 'error'; message: string }>;

export function MonthlyChecklistScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [competence, setCompetence] = useState(currentOccurrenceCompetence);
  const occurrences = useObligationOccurrencesSource(competence);
  const obligations = useQuery(api.obligations.list, {
    includeInactive: false,
  });
  const [submission, setSubmission] = useState<SubmissionState>({
    status: 'idle',
  });
  const attemptedCompetences = useRef(new Set<string>());
  const activeObligationCount = obligations?.items.length ?? 0;
  const progress = useMemo(
    () => buildMonthlyChecklistProgress(occurrences.items),
    [occurrences.items],
  );
  const isLoading =
    obligations === undefined || occurrences.status === 'loading';
  const isBusy =
    submission.status === 'materializing' || submission.status === 'changing';

  const materialize = useCallback(async () => {
    setSubmission({ status: 'materializing' });

    try {
      await occurrences.materialize();
      setSubmission({ status: 'idle' });
    } catch {
      setSubmission({
        status: 'error',
        message:
          'Não foi possível preparar este mês. Nenhum item existente foi alterado.',
      });
    }
  }, [occurrences]);

  useEffect(() => {
    if (
      isLoading ||
      activeObligationCount === 0 ||
      occurrences.items.length > 0 ||
      attemptedCompetences.current.has(competence)
    ) {
      return;
    }

    attemptedCompetences.current.add(competence);
    void materialize();
  }, [
    activeObligationCount,
    competence,
    isLoading,
    materialize,
    occurrences.items.length,
  ]);

  const changeCompetence = (offset: number) => {
    setCompetence((current) => shiftOccurrenceCompetence(current, offset));
    setSubmission({ status: 'idle' });
  };

  const runItemAction = async (
    item: ObligationOccurrenceListItem,
    action: MonthlyChecklistAction,
  ) => {
    setSubmission({
      status: 'changing',
      operationKey: `${action}:${item.id}`,
    });

    try {
      if (action === 'complete') {
        await occurrences.complete(item.id);
      } else if (action === 'waive') {
        await occurrences.waive(item.id, 'notDueThisCompetence');
      } else {
        await occurrences.reopen(item.id);
      }

      setSubmission({
        status: 'success',
        message:
          action === 'complete'
            ? 'Conclusão manual registrada.'
            : action === 'waive'
              ? 'Item retirado somente deste mês.'
              : 'Item reaberto.',
      });
    } catch {
      setSubmission({
        status: 'error',
        message: 'Não foi possível atualizar o item. Tente novamente.',
      });
    }
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
            <Text variant="overline">Seu mês</Text>
            <Text variant="screenTitle">Checklist</Text>
            <Text variant="caption" className="max-w-2xl leading-5">
              O que precisa ser concluído, em ordem de atenção e vencimento.
            </Text>
          </View>

          <View className="flex-row flex-wrap items-center justify-between gap-3">
            <View className="gap-0.5">
              <Text variant="label" className="capitalize">
                {formatOccurrenceCompetence(competence)}
              </Text>
              <Text variant="caption" className="tabular-nums">
                {progress.label}
              </Text>
            </View>
            <View className="flex-row flex-wrap gap-2">
              {__DEV__ ? (
                <Button
                  variant="outline"
                  size="compact"
                  onPress={() =>
                    router.push({
                      pathname: '/checklist',
                      params: { scenario: 'demo' },
                    })
                  }>
                  <Text>Ver exemplo</Text>
                </Button>
              ) : null}
              <Button
                variant="ghost"
                size="compact"
                onPress={() => router.push('/obligations')}>
                <Text>Editar recorrências</Text>
              </Button>
            </View>
          </View>
        </View>

        <Card className="gap-3 py-4">
          <CardContent className="gap-3">
            <View className="flex-row gap-2">
              <Button
                variant="outline"
                className="flex-1"
                disabled={isBusy}
                onPress={() => changeCompetence(-1)}>
                <Text>Mês anterior</Text>
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                disabled={isBusy}
                onPress={() => changeCompetence(1)}>
                <Text>Próximo mês</Text>
              </Button>
            </View>

            {progress.total > 0 ? (
              <View
                accessible
                accessibilityLabel={`${progress.label}, ${progress.percentage}%`}
                className="gap-2">
                <View className="h-2 overflow-hidden rounded-full bg-surface-muted">
                  <View
                    className="h-full rounded-full bg-action-primary"
                    style={{ width: `${progress.percentage}%` }}
                  />
                </View>
                <Text variant="caption" className="tabular-nums">
                  {progress.remaining === 0
                    ? 'Tudo resolvido neste mês'
                    : `${progress.remaining} ${
                        progress.remaining === 1 ? 'item restante' : 'itens restantes'
                      }`}
                </Text>
              </View>
            ) : null}
          </CardContent>
        </Card>

        {submission.status === 'success' || submission.status === 'error' ? (
          <View
            accessibilityLiveRegion="polite"
            className={cn(
              'rounded-control px-4 py-3',
              submission.status === 'success'
                ? 'bg-status-recent-soft'
                : 'bg-status-danger-soft',
            )}>
            <Text variant="body">{submission.message}</Text>
          </View>
        ) : null}

        {isLoading || submission.status === 'materializing' ? (
          <ChecklistLoading
            message={
              submission.status === 'materializing'
                ? 'Preparando os itens recorrentes deste mês…'
                : 'Carregando sua checklist…'
            }
          />
        ) : occurrences.items.length === 0 ? (
          <ChecklistEmpty
            hasActiveObligations={activeObligationCount > 0}
            materializationFailed={submission.status === 'error'}
            onRetry={() => {
              void materialize();
            }}
            onConfigure={() => router.push('/obligations')}
          />
        ) : (
          <Card className="gap-0 py-0">
            {occurrences.items.map((item, index) => (
              <ChecklistItem
                key={item.id}
                item={item}
                isFirst={index === 0}
                activeOperation={
                  submission.status === 'changing'
                    ? submission.operationKey
                    : null
                }
                disabled={isBusy}
                onAction={(action) => void runItemAction(item, action)}
              />
            ))}
          </Card>
        )}

        {occurrences.isTruncated || obligations?.isTruncated ? (
          <View className="rounded-control bg-status-warning-soft px-4 py-3">
            <Text variant="caption" className="leading-5 text-ink">
              A lista atingiu o limite operacional. Revise as recorrências antes
              de continuar.
            </Text>
          </View>
        ) : null}

        <View className="gap-1 px-1">
          <Text variant="label">Sobre a conclusão</Text>
          <Text variant="caption" className="max-w-2xl leading-5">
            “Concluir manualmente” registra sua confirmação. Pagamento
            Identificado depende de evidência encontrada nos dados importados e
            continua sendo uma informação separada.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

function ChecklistLoading({ message }: { message: string }) {
  return (
    <View accessibilityLiveRegion="polite" className="gap-3">
      <Text variant="caption">{message}</Text>
      <View className="h-24 rounded-card bg-surface-muted" />
      <View className="h-24 rounded-card bg-surface-muted" />
    </View>
  );
}

function ChecklistEmpty({
  hasActiveObligations,
  materializationFailed,
  onRetry,
  onConfigure,
}: {
  hasActiveObligations: boolean;
  materializationFailed: boolean;
  onRetry: () => void;
  onConfigure: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {hasActiveObligations
            ? 'Nenhum item preparado'
            : 'Sua checklist começa pelas recorrências'}
        </CardTitle>
        <CardDescription className="text-body leading-6">
          {hasActiveObligations
            ? 'As recorrências continuam preservadas. Tente preparar este mês novamente.'
            : 'Cadastre uma vez o que costuma acontecer todo mês. O Brenotion prepara a próxima checklist automaticamente.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {hasActiveObligations && materializationFailed ? (
          <Button onPress={onRetry}>
            <Text>Tentar novamente</Text>
          </Button>
        ) : (
          <Button onPress={onConfigure}>
            <Text>Adicionar recorrência</Text>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function ChecklistItem({
  item,
  isFirst,
  activeOperation,
  disabled,
  onAction,
}: {
  item: ObligationOccurrenceListItem;
  isFirst: boolean;
  activeOperation: string | null;
  disabled: boolean;
  onAction: (action: MonthlyChecklistAction) => void;
}) {
  const actions = actionsForChecklistStatus(item.status);
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
            className={cn('min-w-0 flex-1 leading-5', resolved && 'line-through')}>
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
              {checklistStatusLabel(item)}
            </Text>
          </View>
        </View>

        <View className="flex-row flex-wrap gap-x-3 gap-y-1">
          <Text variant="caption">{item.dueLabel}</Text>
          {item.expectedAmountLabel ? (
            <Text variant="caption" className="tabular-nums text-ink">
              {item.expectedAmountLabel}
            </Text>
          ) : null}
        </View>
      </View>

      <View className="flex-row flex-wrap gap-2">
        {actions.map((action) => {
          const operationKey = `${action}:${item.id}`;
          const isSubmitting = activeOperation === operationKey;

          return (
            <Button
              key={action}
              variant={action === 'complete' ? 'primary' : 'outline'}
              size="compact"
              disabled={disabled}
              accessibilityState={{ disabled, busy: isSubmitting }}
              onPress={() => onAction(action)}>
              <Text>
                {isSubmitting ? 'Salvando…' : checklistActionLabel(action)}
              </Text>
            </Button>
          );
        })}
      </View>
    </View>
  );
}

function checklistStatusLabel(item: ObligationOccurrenceListItem): string {
  if (item.status === 'waived') {
    return 'Não neste mês';
  }

  return item.statusLabel;
}

function checklistActionLabel(action: MonthlyChecklistAction): string {
  switch (action) {
    case 'complete':
      return 'Concluir manualmente';
    case 'waive':
      return 'Não neste mês';
    case 'reopen':
      return 'Reabrir';
  }
}
