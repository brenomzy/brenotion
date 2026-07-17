import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

type DataConfidenceStatus = 'recent' | 'partial' | 'stale' | 'offline' | 'error' | 'uncertain';

type DataConfidenceProps = {
  status: DataConfidenceStatus;
  description: string;
  title?: string;
  referenceLabel?: string;
  className?: string;
  compact?: boolean;
};

const statusPresentation: Record<
  DataConfidenceStatus,
  { title: string; symbol: string; containerClassName: string }
> = {
  recent: {
    title: 'Dados atualizados',
    symbol: '✓',
    containerClassName: 'bg-status-recent-soft',
  },
  partial: {
    title: 'Dados parciais',
    symbol: '◐',
    containerClassName: 'bg-status-warning-soft',
  },
  stale: {
    title: 'Dados desatualizados',
    symbol: '!',
    containerClassName: 'bg-status-warning-soft',
  },
  offline: {
    title: 'Você está offline',
    symbol: '↯',
    containerClassName: 'bg-surface-muted',
  },
  error: {
    title: 'Não foi possível atualizar',
    symbol: '!',
    containerClassName: 'bg-status-danger-soft',
  },
  uncertain: {
    title: 'Confirmação necessária',
    symbol: '?',
    containerClassName: 'bg-status-warning-soft',
  },
};

function DataConfidence({
  status,
  description,
  title,
  referenceLabel,
  className,
  compact = false,
}: DataConfidenceProps) {
  const presentation = statusPresentation[status];

  return (
    <View
      accessibilityRole="summary"
      className={cn(
        'flex-row items-start gap-3 rounded-control',
        compact ? 'px-3 py-2' : 'p-4',
        presentation.containerClassName,
        className
      )}>
      <View
        aria-hidden
        importantForAccessibility="no-hide-descendants"
        className="h-6 w-6 shrink-0 items-center justify-center rounded-control border border-divider bg-surface">
        <Text className="text-label font-bold text-ink">{presentation.symbol}</Text>
      </View>
      <View className="min-w-0 flex-1 gap-0.5">
        <Text variant="label">{title ?? presentation.title}</Text>
        <Text variant="caption" className="leading-5 text-ink">
          {description}
        </Text>
        {referenceLabel ? (
          <Text variant="caption" className="tabular-nums">
            {referenceLabel}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export { DataConfidence };
export type { DataConfidenceProps, DataConfidenceStatus };
