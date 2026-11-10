'use client';

import { Alert } from './alert';
import { Button } from './button';
import { Sheet } from './sheet';

interface ConfirmDialogProps {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
  pending?: boolean;
  error?: string | null;
  tone?: 'default' | 'destructive' | 'success';
}

const CONFIRM_CLASS = {
  default: undefined,
  destructive: 'bg-destructive text-white hover:bg-destructive/90',
  success: 'bg-success text-success-foreground hover:bg-success/90',
};

export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  onConfirm,
  onClose,
  pending = false,
  error,
  tone = 'default',
}: ConfirmDialogProps) {
  return (
    <Sheet eyebrow="Please confirm" title={title} onClose={onClose}>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      {error && <Alert className="mt-4">{error}</Alert>}
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
          className={`w-full sm:w-auto ${CONFIRM_CLASS[tone] ?? ''}`}
        >
          {pending ? 'Working…' : confirmLabel}
        </Button>
      </div>
    </Sheet>
  );
}
