import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

type ScreenState = 'loading' | 'empty' | 'partial' | 'stale' | 'offline' | 'error' | 'uncertain';

type ScreenStatePanelAction =
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

type ScreenStatePanelProps = {
  state: ScreenState;
  title: string;
  description: string;
  referenceLabel?: string;
  secondaryAction?: ReactNode;
  className?: string;
} & ScreenStatePanelAction;

const stateSymbol: Record<ScreenState, string> = {
  loading: '…',
  empty: '+',
  partial: '◐',
  stale: '!',
  offline: '↯',
  error: '!',
  uncertain: '?',
};

const stateSurfaceClassName: Record<ScreenState, string> = {
  loading: 'bg-surface',
  empty: 'bg-surface',
  partial: 'bg-status-warning-soft',
  stale: 'bg-status-warning-soft',
  offline: 'bg-surface-muted',
  error: 'bg-status-danger-soft',
  uncertain: 'bg-status-warning-soft',
};

function ScreenStatePanel({
  state,
  title,
  description,
  referenceLabel,
  actionLabel,
  onActionPress,
  actionDisabled = false,
  secondaryAction,
  className,
}: ScreenStatePanelProps) {
  return (
    <Card
      accessibilityLiveRegion={state === 'loading' ? 'polite' : undefined}
      className={cn(
        'border border-divider py-0 shadow-none',
        stateSurfaceClassName[state],
        className
      )}>
      <CardContent className="items-start gap-4 p-5">
        <View
          aria-hidden
          importantForAccessibility="no-hide-descendants"
          className="h-11 w-11 items-center justify-center rounded-control border border-divider bg-surface">
          <Text variant="sectionTitle">{stateSymbol[state]}</Text>
        </View>
        <View className="gap-1">
          <Text variant="sectionTitle">{title}</Text>
          <Text variant="body" className="leading-6 text-ink-muted">
            {description}
          </Text>
          {referenceLabel ? (
            <Text variant="caption" className="pt-1 tabular-nums text-ink">
              {referenceLabel}
            </Text>
          ) : null}
        </View>
        {actionLabel && onActionPress ? (
          <Button
            disabled={actionDisabled}
            onPress={onActionPress}
            className="w-full">
            <Text>{actionLabel}</Text>
          </Button>
        ) : null}
        {secondaryAction}
      </CardContent>
    </Card>
  );
}

export { ScreenStatePanel };
export type { ScreenState, ScreenStatePanelProps };
