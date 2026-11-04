import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium leading-tight tracking-wide whitespace-nowrap',
  {
    variants: {
      tone: {
        neutral: 'bg-tone-neutral-bg text-tone-neutral-fg',
        brand: 'bg-tone-brand-bg text-tone-brand-fg',
        success: 'bg-tone-success-bg text-tone-success-fg',
        info: 'bg-tone-info-bg text-tone-info-fg',
        warning: 'bg-tone-warning-bg text-tone-warning-fg',
        danger: 'bg-tone-danger-bg text-tone-danger-fg',
      },
    },
    defaultVariants: {
      tone: 'neutral',
    },
  }
);

export type BadgeTone = NonNullable<
  VariantProps<typeof badgeVariants>['tone']
>;

interface BadgeProps extends ComponentProps<'span'> {
  tone?: BadgeTone;
}

export function Badge({ tone = 'neutral', className, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone }), className)} {...props} />
  );
}

export { badgeVariants };
