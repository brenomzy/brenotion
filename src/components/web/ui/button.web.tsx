import { Button as BaseButton } from '@base-ui/react/button';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

const webButtonVariants = cva(
  'inline-flex min-h-11 select-none items-center justify-center gap-2 rounded-control px-4 text-label font-sans-bold outline-none transition-[scale,background-color,box-shadow] duration-150 ease-out focus-visible:ring-[3px] focus-visible:ring-focus-ring/45 disabled:pointer-events-none disabled:opacity-50 active:not-disabled:scale-[0.96]',
  {
    variants: {
      variant: {
        primary:
          'bg-action-primary text-ink-on-action shadow-[0_1px_2px_oklch(0_0_0/0.12)] hover:bg-action-primary-pressed',
        secondary:
          'bg-action-primary-soft text-ink shadow-[0_0_0_1px_oklch(0_0_0/0.06)] hover:bg-surface-muted',
        outline:
          'bg-surface text-ink shadow-[0_0_0_1px_oklch(0_0_0/0.12)] hover:bg-surface-muted',
        ghost: 'bg-transparent text-ink hover:bg-surface-muted',
      },
    },
    defaultVariants: { variant: 'primary' },
  },
);

type WebButtonProps = ComponentProps<typeof BaseButton> &
  VariantProps<typeof webButtonVariants>;

export function WebButton({ className, variant, ...props }: WebButtonProps) {
  return (
    <BaseButton
      data-slot="button"
      className={cn(webButtonVariants({ variant }), className)}
      {...props}
    />
  );
}
