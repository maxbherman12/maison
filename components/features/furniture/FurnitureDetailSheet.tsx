'use client';

import { useState } from 'react';
import { CheckCircle2, ExternalLink, Pencil, Trash2 } from 'lucide-react';
import { deleteFurniture } from '@/lib/actions/furniture';
import { useAction } from '@/lib/actions/use-action';
import { FURNITURE_STATUSES, type FurnitureStatus } from '@/lib/domain/furniture';
import { formatMoney } from '@/lib/domain/money';
import type { FurnitureItem } from '@/lib/domain/types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Sheet } from '@/components/ui/sheet';
import { FURNITURE_STATUS_META } from './furniture-status';

interface FurnitureDetailSheetProps {
  item: FurnitureItem;
  onClose: () => void;
  onMove: (status: FurnitureStatus) => void;
  onDeleted: () => void;
  onEdit?: () => void;
}

/**
 * A piece's details, status moves, and delete confirmation. Once a piece has
 * been invoiced only its status can change, so editing and deleting are hidden.
 */
export function FurnitureDetailSheet({
  item,
  onClose,
  onMove,
  onDeleted,
  onEdit,
}: FurnitureDetailSheetProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const { run, pending, error } = useAction();
  const isPendingBilling = item.invoiceId === null;

  if (confirmingDelete) {
    return (
      <ConfirmDialog
        title="Delete furniture entry?"
        description={`This will remove ${item.name} from the project. This cannot be undone.`}
        confirmLabel="Delete entry"
        tone="destructive"
        pending={pending}
        error={error}
        onClose={() => setConfirmingDelete(false)}
        onConfirm={() => run(() => deleteFurniture(item.id), onDeleted)}
      />
    );
  }

  return (
    <Sheet
      eyebrow="Furniture"
      title={item.name}
      description={item.vendor || 'No vendor'}
      onClose={onClose}
    >
      <div>
        <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Move to
        </p>
        <div className="grid gap-2">
          {FURNITURE_STATUSES.map((status) => {
            const meta = FURNITURE_STATUS_META[status];
            const Icon = meta.icon;
            const isCurrent = item.status === status;

            return (
              <button
                key={status}
                type="button"
                aria-pressed={isCurrent}
                onClick={() => onMove(status)}
                className={cn(
                  'flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors',
                  isCurrent
                    ? 'border-foreground/15 bg-background'
                    : 'border-border bg-card hover:border-foreground/20 hover:bg-secondary'
                )}
              >
                <span
                  className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-full',
                    meta.tint,
                    meta.text
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <span className="flex-1 text-sm font-medium">{status}</span>
                {isCurrent && (
                  <Badge tone={meta.tone} className="gap-1">
                    <CheckCircle2 className="size-3.5" /> Now
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6 grid gap-4 border-t border-border pt-5">
        <div className="grid grid-cols-2 gap-4">
          <Detail label="Retail" value={formatMoney(item.retailCents)} />
          <Detail label="Trade" value={formatMoney(item.tradeCents)} />
        </div>
        <Detail label="Tags" value={item.tags.join(', ') || 'No tags'} />
        <Detail label="Notes" value={item.notes || 'No notes'} />
        {item.link && (
          <a
            href={item.link}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex w-fit items-center gap-1.5 text-sm text-primary hover:underline"
          >
            Open product link <ExternalLink className="size-3.5" />
          </a>
        )}
      </div>

      {isPendingBilling ? (
        <div className="mt-6 grid gap-2">
          {onEdit && (
            <Button
              type="button"
              variant="outline"
              onClick={onEdit}
              className="w-full text-primary"
            >
              <Pencil className="size-4" /> Edit details
            </Button>
          )}
          <Button
            type="button"
            variant="destructive"
            onClick={() => setConfirmingDelete(true)}
            className="w-full"
          >
            <Trash2 className="size-4" /> Delete furniture entry
          </Button>
        </div>
      ) : (
        <p className="mt-6 text-xs text-muted-foreground">
          This piece has been invoiced, so only its status can change.
        </p>
      )}
    </Sheet>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="block text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </span>
      <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{value}</p>
    </div>
  );
}
