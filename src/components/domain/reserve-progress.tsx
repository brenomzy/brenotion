import { View } from 'react-native';

import { MoneyValue } from '@/components/domain/money-value';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

type ReserveScope = 'company' | 'personal';

type ReserveProgressProps = {
  label: string;
  scope: ReserveScope;
  currentMinorUnits: bigint;
  targetMinorUnits: bigint;
  currency: 'BRL';
  progressPercent: number;
  progressLabel: string;
  description?: string;
  className?: string;
};

const scopeLabel: Record<ReserveScope, string> = {
  company: 'Empresa',
  personal: 'Pessoal',
};

function ReserveProgress({
  label,
  scope,
  currentMinorUnits,
  targetMinorUnits,
  currency,
  progressPercent,
  progressLabel,
  description,
  className,
}: ReserveProgressProps) {
  const boundedProgress = Number.isFinite(progressPercent)
    ? Math.min(100, Math.max(0, progressPercent))
    : 0;

  return (
    <View className={cn('gap-3 rounded-card border border-divider bg-surface p-4', className)}>
      <View className="flex-row flex-wrap items-start justify-between gap-2">
        <View className="min-w-0 flex-1 gap-0.5">
          <Text variant="label">{label}</Text>
          <Text variant="caption">{scopeLabel[scope]}</Text>
        </View>
        <Text variant="caption" className="tabular-nums text-ink">
          {progressLabel}
        </Text>
      </View>

      <View
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: Math.round(boundedProgress), text: progressLabel }}
        className="h-2 overflow-hidden rounded-control bg-money-protected">
        <View
          className="h-full rounded-control bg-ink"
          style={{ width: `${boundedProgress}%` }}
        />
      </View>

      <View className="flex-row flex-wrap items-baseline justify-between gap-2">
        <View className="gap-0.5">
          <Text variant="caption">Protegido</Text>
          <MoneyValue minorUnits={currentMinorUnits} currency={currency} size="label" />
        </View>
        <View className="items-end gap-0.5">
          <Text variant="caption">Marco</Text>
          <MoneyValue minorUnits={targetMinorUnits} currency={currency} size="label" />
        </View>
      </View>

      {description ? (
        <Text variant="caption" className="leading-5">
          {description}
        </Text>
      ) : null}
    </View>
  );
}

export { ReserveProgress };
export type { ReserveProgressProps, ReserveScope };
