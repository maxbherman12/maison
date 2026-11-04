'use client';

import { CheckCircle2, ExternalLink, Pencil, Trash2 } from 'lucide-react';
import type { FurnitureItem, FurnitureStatus } from '@/lib/types';
import { formatMoney } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import {
  FURNITURE_STATUS_META,
  FURNITURE_STATUS_ORDER,
} from './furniture-status';

interface FurnitureSheetProps {
  item: FurnitureItem;
  onClose: () => void;
  onMove: (status: FurnitureStatus) => void;
  onDelete: () => void;
  onEdit?: () => void;
}

export function FurnitureSheet({
  item,
  onClose,
  onMove,
  onDelete,
  onEdit,
}: FurnitureSheetProps) {
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
          {FURNITURE_STATUS_ORDER.map((status) => {
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
          <Detail label="Retail" value={formatMoney(item.retail)} />
          <Detail label="Trade" value={formatMoney(item.trade)} />
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

      {onEdit && (
        <Button
          type="button"
          variant="outline"
          onClick={onEdit}
          className="mt-6 w-full text-primary"
        >
          <Pencil className="size-4" /> Edit details
        </Button>
      )}

      <Button
        type="button"
        variant="destructive"
        onClick={onDelete}
        className={cn('w-full', onEdit ? 'mt-2' : 'mt-6')}
      >
        <Trash2 className="size-4" /> Delete furniture entry
      </Button>
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
