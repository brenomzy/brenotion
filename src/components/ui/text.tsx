import { Slot } from '@rn-primitives/slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { Platform, Text as RNText, type Role } from 'react-native';

import { cn } from '@/lib/utils';

const textVariants = cva(
  cn('font-sans text-body text-ink', Platform.select({ web: 'select-text antialiased' })),
  {
    variants: {
      variant: {
        default: '',
        screenTitle: 'text-title-screen font-bold',
        sectionTitle: 'text-title-section font-bold',
        body: 'text-body',
        label: 'text-label font-semibold',
        caption: 'text-caption font-medium text-ink-muted',
        overline: 'text-overline font-bold text-ink-muted uppercase',
        money: 'text-display-money font-bold tabular-nums',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

type TextVariantProps = VariantProps<typeof textVariants>;
type TextVariant = NonNullable<TextVariantProps['variant']>;

const ROLE: Partial<Record<TextVariant, Role>> = {
  screenTitle: 'heading',
  sectionTitle: 'heading',
};

const ARIA_LEVEL: Partial<Record<TextVariant, string>> = {
  screenTitle: '1',
  sectionTitle: '2',
};

const TextClassContext = React.createContext<string | undefined>(undefined);

function Text({
  className,
  asChild = false,
  variant = 'default',
  ...props
}: React.ComponentProps<typeof RNText> &
  React.RefAttributes<RNText> &
  TextVariantProps & {
    asChild?: boolean;
  }) {
  const inheritedClassName = React.useContext(TextClassContext);
  const Component = asChild ? Slot : RNText;

  return (
    <Component
      className={cn(textVariants({ variant }), inheritedClassName, className)}
      role={variant ? ROLE[variant] : undefined}
      aria-level={variant ? ARIA_LEVEL[variant] : undefined}
      {...props}
    />
  );
}

export { Text, TextClassContext, textVariants };
