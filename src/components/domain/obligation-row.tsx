import { View } from 'react-native';

import { MoneyValue } from '@/components/domain/money-value';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

type ObligationStatus = 'upcoming' | 'at-risk' | 'identified' | 'pending-evidence';
type ObligationScope = 'company' | 'personal';

type ObligationRowAction =
  | {
      actionLabel: string;
      onActionPress: () => void;
      actionDisabled?: boolean;
    }
  | {
      actionLabel?: never;
      onActionPress?: never;
      actionDisabled?: never;
    };

type ObligationRowProps = {
  title: string;
  dueLabel: string;
  status: ObligationStatus;
  scope: ObligationScope;
  expectedAmountMinorUnits?: bigint;
  currency?: 'BRL';
  evidenceLabel?: string;
  className?: string;
} & ObligationRowAction;

const statusLabel: Record<ObligationStatus, string> = {
  upcoming: 'Próxima',
  'at-risk': 'Exige atenção',
  identified: 'Pagamento identificado',
  'pending-evidence': 'Evidência pendente',
};

const scopeLabel: Record<ObligationScope, string> = {
  company: 'Empresa',
  personal: 'Pessoal',
};

function ObligationRow({
  title,
  dueLabel,
  status,
  scope,
  expectedAmountMinorUnits,
  currency = 'BRL',
  evidenceLabel,
  actionLabel,
  onActionPress,
  actionDisabled = false,
  className,
}: ObligationRowProps) {
  return (
    <View className={cn('gap-3 border-b border-divider py-4', className)}>
      <View className="flex-row items-start gap-3">
        <View
          aria-hidden
          importantForAccessibility="no-hide-descendants"
          className="mt-0.5 h-6 w-6 shrink-0 items-center justify-center rounded-control border border-divider bg-surface-muted">
          <Text className="text-label font-sans-bold text-ink">
            {status === 'identified' ? '✓' : status === 'at-risk' ? '!' : '•'}
          </Text>
        </View>
        <View className="min-w-0 flex-1 gap-1">
          <View className="flex-row flex-wrap items-start justify-between gap-2">
            <View className="min-w-0 flex-1">
              <Text variant="label">{title}</Text>
              <Text variant="caption" className="tabular-nums">
                {dueLabel}
              </Text>
            </View>
            {expectedAmountMinorUnits !== undefined ? (
              <MoneyValue
                minorUnits={expectedAmountMinorUnits}
                currency={currency}
                size="label"
              />
            ) : null}
          </View>
          <Text variant="caption" className="text-ink">
            {scopeLabel[scope]} · {statusLabel[status]}
          </Text>
          {evidenceLabel ? (
            <Text variant="caption" className="leading-5">
              {evidenceLabel}
            </Text>
          ) : null}
        </View>
      </View>

      {actionLabel && onActionPress ? (
        <Button
          variant="outline"
          size="compact"
          disabled={actionDisabled}
          onPress={onActionPress}
          className="self-stretch">
          <Text>{actionLabel}</Text>
        </Button>
      ) : null}
    </View>
  );
}

export { ObligationRow };
export type { ObligationRowProps, ObligationScope, ObligationStatus };
