import { cva, type VariantProps } from 'class-variance-authority';
import { Platform, Pressable } from 'react-native';

import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  cn(
    'group scale-100 shrink-0 flex-row items-center justify-center gap-2 rounded-control',
    Platform.select({
      web: 'outline-none transition-transform duration-150 ease-out focus-visible:ring-[3px] focus-visible:ring-focus-ring/45 disabled:pointer-events-none',
    })
  ),
  {
    variants: {
      variant: {
        primary: cn(
          'bg-action-primary active:bg-action-primary-pressed shadow-sm shadow-black/5',
          Platform.select({ web: 'hover:bg-action-primary-pressed' })
        ),
        secondary: cn(
          'bg-action-primary-soft active:bg-action-primary-soft/70',
          Platform.select({ web: 'hover:bg-action-primary-soft/70' })
        ),
        outline: cn(
          'border border-divider bg-surface active:bg-surface-muted',
          Platform.select({ web: 'hover:bg-surface-muted' })
        ),
        ghost: cn(
          'bg-transparent active:bg-surface-muted',
          Platform.select({ web: 'hover:bg-surface-muted' })
        ),
        destructive: cn(
          'bg-status-danger active:bg-status-danger/90 shadow-sm shadow-black/5',
          Platform.select({ web: 'hover:bg-status-danger/90' })
        ),
      },
      size: {
        default: 'h-12 px-4 py-3',
        compact: 'h-11 px-3 py-2',
        icon: 'h-11 w-11',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  }
);

const buttonTextVariants = cva('text-label font-sans-bold', {
  variants: {
    variant: {
      primary: 'text-ink-on-action',
      secondary: 'text-ink',
      outline: 'text-ink',
      ghost: 'text-ink',
      destructive: 'text-white',
    },
    size: {
      default: '',
      compact: '',
      icon: '',
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'default',
  },
});

type ButtonProps = React.ComponentProps<typeof Pressable> &
  VariantProps<typeof buttonVariants> & {
    static?: boolean;
  };

function Button({ className, variant, size, static: isStatic = false, ...props }: ButtonProps) {
  return (
    <TextClassContext.Provider value={buttonTextVariants({ variant, size })}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: Boolean(props.disabled) }}
        className={cn(
          props.disabled && 'opacity-50',
          !isStatic && !props.disabled && 'active:scale-[0.96]',
          buttonVariants({ variant, size }),
          className
        )}
        {...props}
      />
    </TextClassContext.Provider>
  );
}

export { Button, buttonTextVariants, buttonVariants };
export type { ButtonProps };
