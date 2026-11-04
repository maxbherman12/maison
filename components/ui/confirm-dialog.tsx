'use client';

import { cn } from '@/lib/utils';
import { Button } from './button';
import { Sheet } from './sheet';

type ConfirmTone = 'default' | 'destructive' | 'success';

interface ConfirmDialogProps {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
  pending?: boolean;
  tone?: ConfirmTone;
}

export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  onConfirm,
  onClose,
  pending = false,
  tone = 'default',
}: ConfirmDialogProps) {
  return (
    <Sheet eyebrow="Please confirm" title={title} onClose={onClose}>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={pending}
          className="w-full sm:w-auto"
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={onConfirm}
          disabled={pending}
          className={cn(
            'w-full sm:w-auto',
            tone === 'destructive' &&
              'bg-destructive text-white hover:bg-destructive/90',
            tone === 'success' && 'bg-success text-success-foreground'
          )}
        >
          {pending ? 'Working…' : confirmLabel}
        </Button>
      </div>
    </Sheet>
  );
}
