import { Text } from '@/components/ui/text';
import {
  formatBrlMinorUnits,
  type MoneyCentsDisplay,
} from '@/components/domain/money-format';
import { cn } from '@/lib/utils';

type MoneyValueSize = 'display' | 'body' | 'label';

type MoneyValueProps = {
  minorUnits: bigint;
  currency: 'BRL';
  size?: MoneyValueSize;
  showCents?: MoneyCentsDisplay;
  className?: string;
  accessibilityLabel?: string;
};

const sizeClassName: Record<MoneyValueSize, string> = {
  display: 'text-display-money font-bold',
  body: 'text-body font-semibold',
  label: 'text-label font-bold',
};

function MoneyValue({
  minorUnits,
  currency,
  size = 'body',
  showCents = 'always',
  className,
  accessibilityLabel,
}: MoneyValueProps) {
  const formattedValue = formatBrlMinorUnits(minorUnits, showCents);

  return (
    <Text
      accessibilityLabel={accessibilityLabel ?? formattedValue}
      className={cn('tabular-nums text-ink', sizeClassName[size], className)}>
      {formattedValue}
    </Text>
  );
}

export { MoneyValue };
export type { MoneyValueProps };
