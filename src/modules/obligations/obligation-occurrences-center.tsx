import { useState } from 'react';
import { Pressable, View } from 'react-native';

import type { Id } from '../../../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import {
  currentOccurrenceCompetence,
  formatOccurrenceCompetence,
  shiftOccurrenceCompetence,
  WAIVER_REASON_OPTIONS,
  type ObligationOccurrenceAction,
  type ObligationOccurrenceListItem,
  type ObligationOccurrenceWaiverReason,
} from './obligation-occurrences-presentation-model';
import { useObligationOccurrencesSource } from './use-obligation-occurrences-source';

type SubmissionState =
  | Readonly<{ status: 'idle' }>
  | Readonly<{ status: 'submitting'; operationKey: string }>
  | Readonly<{ status: 'success'; message: string }>
  | Readonly<{ status: 'error'; message: string }>;

export function ObligationOccurrencesCenter({
  activeObligationCount,
  obligationsAreLoading,
}: {
  activeObligationCount: number;
  obligationsAreLoading: boolean;
}) {
  const [competence, setCompetence] = useState(currentOccurrenceCompetence);
  const source = useObligationOccurrencesSource(competence);
  const [submission, setSubmission] = useState<SubmissionState>({
    status: 'idle',
  });
  const [waiverTargetId, setWaiverTargetId] =
    useState<Id<'obligationOccurrences'> | null>(null);
  const [waiverReason, setWaiverReason] =
    useState<ObligationOccurrenceWaiverReason | null>(null);
  const isSubmitting = submission.status === 'submitting';

  const changeCompetence = (offset: number) => {
    setCompetence((current) => shiftOccurrenceCompetence(current, offset));
    setSubmission({ status: 'idle' });
    setWaiverTargetId(null);
    setWaiverReason(null);
  };

  const materialize = async () => {
    setSubmission({
      status: 'submitting',
      operationKey: 'materialize',
    });
    try {
      const result = await source.materialize();
      setSubmission({
        status: 'success',
        message:
          result.createdCount === 0
            ? `${result.existingCount} ocorrências já existiam nesta competência.`
            : `${result.createdCount} ${
                result.createdCount === 1 ? 'ocorrência criada' : 'ocorrências criadas'
              }. ${result.existingCount} já existiam.`,
      });
    } catch {
      setSubmission({
        status: 'error',
        message:
          'Não foi possível gerar as ocorrências. Nenhuma decisão foi alterada.',
      });
    }
  };

  const runAction = async (
    item: ObligationOccurrenceListItem,
    action: Exclude<ObligationOccurrenceAction, 'waive'>,
  ) => {
    setSubmission({
      status: 'submitting',
      operationKey: `${action}:${item.id}`,
    });
    try {
      if (action === 'complete') {
        await source.complete(item.id);
      } else if (action === 'markNeedsAttention') {
        await source.markNeedsAttention(item.id);
      } else {
        await source.reopen(item.id);
      }

      setSubmission({
        status: 'success',
        message:
          action === 'complete'
            ? 'Conclusão manual registrada.'
            : action === 'markNeedsAttention'
              ? 'Ocorrência marcada como precisa de atenção.'
              : 'Ocorrência reaberta como pendente.',
      });
      setWaiverTargetId(null);
      setWaiverReason(null);
    } catch {
      setSubmission({
        status: 'error',
        message: 'Não foi possível alterar a ocorrência. Tente novamente.',
      });
    }
  };

  const confirmWaiver = async (item: ObligationOccurrenceListItem) => {
    if (!waiverReason) {
      return;
    }

    setSubmission({
      status: 'submitting',
      operationKey: `waive:${item.id}`,
    });
    try {
      await source.waive(item.id, waiverReason);
      setSubmission({
        status: 'success',
        message: 'Ocorrência dispensada com o motivo registrado.',
      });
      setWaiverTargetId(null);
      setWaiverReason(null);
    } catch {
      setSubmission({
        status: 'error',
        message: 'Não foi possível dispensar a ocorrência. Tente novamente.',
      });
    }
  };

  return (
    <View className="gap-4">
      <View className="gap-1">
        <Text variant="overline">Acompanhamento mensal</Text>
        <Text variant="sectionTitle">Ocorrências de Obrigações</Text>
        <Text variant="caption" className="leading-5">
          As configurações recorrentes só viram itens deste mês quando você
          solicita explicitamente.
        </Text>
      </View>

      <Card>
        <CardHeader className="gap-2">
          <Text variant="overline">Competência</Text>
          <CardTitle className="capitalize">
            {formatOccurrenceCompetence(competence)}
          </CardTitle>
        </CardHeader>
        <CardContent className="gap-3">
          <View className="flex-row gap-2">
            <Button
              variant="outline"
              className="flex-1"
              disabled={isSubmitting}
              onPress={() => changeCompetence(-1)}>
              <Text>Mês anterior</Text>
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              disabled={isSubmitting}
              onPress={() => changeCompetence(1)}>
              <Text>Próximo mês</Text>
            </Button>
          </View>
          <Button
            disabled={
              isSubmitting ||
              obligationsAreLoading ||
              activeObligationCount === 0
            }
            onPress={() => void materialize()}>
            <Text>
              {submission.status === 'submitting' &&
              submission.operationKey === 'materialize'
                ? 'Gerando ocorrências…'
                : 'Gerar ocorrências desta competência'}
            </Text>
          </Button>
          {activeObligationCount === 0 && !obligationsAreLoading ? (
            <Text variant="caption" className="leading-5">
              Cadastre ao menos uma Obrigação ativa antes de gerar ocorrências.
            </Text>
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

      {source.status === 'loading' ? (
        <View accessibilityLiveRegion="polite" className="gap-3">
          <Text variant="caption">Carregando ocorrências desta competência…</Text>
          <View className="h-40 rounded-card bg-surface-muted" />
        </View>
      ) : source.items.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Nenhuma ocorrência nesta competência</CardTitle>
            <CardDescription className="text-body leading-6">
              Isso não significa que os compromissos foram concluídos. Gere as
              ocorrências explicitamente a partir das configurações ativas.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card className="gap-0 py-0">
          {source.items.map((item, index) => (
            <OccurrenceRow
              key={item.id}
              item={item}
              isFirst={index === 0}
              disabled={isSubmitting}
              waiverIsOpen={waiverTargetId === item.id}
              waiverReason={waiverReason}
              onAction={(action) => {
                if (action === 'waive') {
                  setWaiverTargetId(item.id);
                  setWaiverReason(null);
                  setSubmission({ status: 'idle' });
                  return;
                }
                void runAction(item, action);
              }}
              onWaiverReasonChange={setWaiverReason}
              onCancelWaiver={() => {
                setWaiverTargetId(null);
                setWaiverReason(null);
              }}
              onConfirmWaiver={() => void confirmWaiver(item)}
            />
          ))}
        </Card>
      )}

      {source.isTruncated ? (
        <View className="rounded-control bg-status-warning-soft px-4 py-3">
          <Text variant="caption">
            Apenas as primeiras 200 ocorrências estão visíveis.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function OccurrenceRow({
  item,
  isFirst,
  disabled,
  waiverIsOpen,
  waiverReason,
  onAction,
  onWaiverReasonChange,
  onCancelWaiver,
  onConfirmWaiver,
}: {
  item: ObligationOccurrenceListItem;
  isFirst: boolean;
  disabled: boolean;
  waiverIsOpen: boolean;
  waiverReason: ObligationOccurrenceWaiverReason | null;
  onAction: (action: ObligationOccurrenceAction) => void;
  onWaiverReasonChange: (reason: ObligationOccurrenceWaiverReason) => void;
  onCancelWaiver: () => void;
  onConfirmWaiver: () => void;
}) {
  return (
    <View
      className={cn(
        'gap-4 px-5 py-4',
        !isFirst && 'border-t border-divider',
      )}>
      <View className="gap-2">
        <View className="flex-row flex-wrap items-center justify-between gap-2">
          <Text variant="label" className="text-body">
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
              {item.statusLabel}
            </Text>
          </View>
        </View>
        <Text variant="caption">{item.dueLabel}</Text>
        <Text variant="caption">
          Natureza Econômica: {item.economicNatureLabel}
        </Text>
        <Text variant="caption">
          Origem pagadora: {item.paymentOriginLabel}
        </Text>
        {item.expectedAmountLabel ? (
          <Text variant="caption" className="tabular-nums text-ink">
            Valor esperado: {item.expectedAmountLabel}
          </Text>
        ) : (
          <Text variant="caption">Valor esperado não informado</Text>
        )}
        {item.waiverReasonLabel ? (
          <Text variant="caption">
            Motivo da dispensa: {item.waiverReasonLabel}
          </Text>
        ) : null}
      </View>

      <View className="flex-row flex-wrap gap-2">
        {item.actions.map((action) => (
          <Button
            key={action}
            variant={action === 'complete' ? 'primary' : 'outline'}
            size="compact"
            disabled={disabled}
            onPress={() => onAction(action)}>
            <Text>{actionLabel(action, item.status)}</Text>
          </Button>
        ))}
      </View>

      {waiverIsOpen ? (
        <View className="gap-3 rounded-card bg-canvas p-4">
          <View className="gap-1">
            <Text variant="label">Motivo da dispensa</Text>
            <Text variant="caption">
              A dispensa vale somente para esta ocorrência e fica auditada.
            </Text>
          </View>
          {WAIVER_REASON_OPTIONS.map((option) => {
            const selected = waiverReason === option.value;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected, disabled }}
                disabled={disabled}
                onPress={() => onWaiverReasonChange(option.value)}
                className={cn(
                  'gap-1 rounded-control border px-4 py-3',
                  selected
                    ? 'border-action-primary bg-action-primary-soft'
                    : 'border-divider bg-surface',
                  disabled && 'opacity-60',
                )}>
                <Text variant="label">{option.label}</Text>
                <Text variant="caption">{option.description}</Text>
              </Pressable>
            );
          })}
          <View className="flex-row flex-wrap gap-2">
            <Button
              variant="outline"
              size="compact"
              disabled={disabled || waiverReason === null}
              onPress={onConfirmWaiver}>
              <Text>Confirmar dispensa</Text>
            </Button>
            <Button
              variant="ghost"
              size="compact"
              disabled={disabled}
              onPress={onCancelWaiver}>
              <Text>Cancelar</Text>
            </Button>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function actionLabel(
  action: ObligationOccurrenceAction,
  status: ObligationOccurrenceListItem['status'],
): string {
  switch (action) {
    case 'complete':
      return 'Concluir manualmente';
    case 'markNeedsAttention':
      return 'Precisa de atenção';
    case 'waive':
      return 'Dispensar';
    case 'reopen':
      return status === 'needsAttention'
        ? 'Voltar para pendente'
        : 'Reabrir';
  }
}
