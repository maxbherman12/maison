import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

const TONES = {
  error: 'border-destructive/30 bg-destructive/10 text-destructive',
  success: 'border-tone-success-fg/25 bg-tone-success-bg text-tone-success-fg',
  info: 'border-tone-info-fg/25 bg-tone-info-bg text-tone-info-fg',
} as const;

type AlertTone = keyof typeof TONES;

interface AlertProps extends ComponentProps<'div'> {
  tone?: AlertTone;
}

export function Alert({ tone = 'error', className, ...props }: AlertProps) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'rounded-xl border px-4 py-3 text-sm',
        TONES[tone],
        className
      )}
      {...props}
    />
  );
}
