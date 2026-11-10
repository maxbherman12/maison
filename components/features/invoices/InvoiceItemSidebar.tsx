'use client';

import { Pencil, X } from 'lucide-react';
import {
  BILLABLE_KINDS,
  BILLABLE_KIND_LABELS,
  type BillableItem,
} from '@/lib/domain/billing';
import { formatDate } from '@/lib/domain/dates';
import { formatMoney } from '@/lib/domain/money';
import { cn } from '@/lib/utils';

interface InvoiceItemSidebarProps {
  items: BillableItem[];
  excluded: ReadonlySet<string>;
  totalCents: number;
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  onEdit: (id: string) => void;
}

const LINK_BUTTON_CLASS =
  'transition-colors hover:text-accent-foreground hover:underline';

export function InvoiceItemSidebar({
  items,
  excluded,
  totalCents,
  onToggle,
  onSelectAll,
  onClearAll,
  onEdit,
}: InvoiceItemSidebarProps) {
  return (
    <div className="rounded-3xl border border-border bg-secondary p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl">Items</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {items.length - excluded.size} of {items.length} included
          </p>
        </div>
        <p className="font-serif text-xl tabular-nums">{formatMoney(totalCents)}</p>
      </div>

      <div className="mt-3 flex items-center gap-4 text-xs font-medium text-primary">
        <button type="button" onClick={onSelectAll} className={LINK_BUTTON_CLASS}>
          Select all
        </button>
        <button type="button" onClick={onClearAll} className={LINK_BUTTON_CLASS}>
          Clear all
        </button>
      </div>

      <div className="mt-5 space-y-6">
        {BILLABLE_KINDS.map((kind) => {
          const group = items.filter((item) => item.kind === kind);
          if (group.length === 0) return null;

          return (
            <section key={kind} aria-label={`${BILLABLE_KIND_LABELS[kind]} items`}>
              <h3 className="mb-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {BILLABLE_KIND_LABELS[kind]}
              </h3>
              <ul className="space-y-2">
                {group.map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    included={!excluded.has(item.id)}
                    onToggle={() => onToggle(item.id)}
                    onEdit={() => onEdit(item.id)}
                  />
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function itemDetail(item: BillableItem): string {
  switch (item.kind) {
    case 'hours':
      return `${formatDate(item.date)} · ${item.hours} hrs`;
    case 'charge':
      return formatDate(item.date);
    case 'furniture':
      return `${item.vendor || 'No vendor'} · ${item.status}`;
  }
}

function ItemRow({
  item,
  included,
  onToggle,
  onEdit,
}: {
  item: BillableItem;
  included: boolean;
  onToggle: () => void;
  onEdit: () => void;
}) {
  const checkboxId = `include-${item.id}`;

  return (
    <li
      className={cn(
        'rounded-2xl border bg-card p-3 transition-colors',
        included ? 'border-border' : 'border-border/60 opacity-70'
      )}
    >
      <div className="flex items-start gap-3">
        <input
          id={checkboxId}
          type="checkbox"
          checked={included}
          onChange={onToggle}
          className="mt-0.5 size-5 shrink-0 accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2"
        />
        <div className="min-w-0 flex-1">
          <label
            htmlFor={checkboxId}
            className="block cursor-pointer truncate text-sm font-medium text-foreground"
          >
            {item.title}
          </label>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {itemDetail(item)}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className="text-sm font-medium tabular-nums">
            {formatMoney(item.amountCents)}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onEdit}
              aria-label={`Edit ${item.title}`}
              title="Edit item"
              className="flex size-11 items-center justify-center rounded-full border border-border text-primary transition-colors hover:bg-accent"
            >
              <Pencil className="size-4" />
            </button>
            <button
              type="button"
              onClick={onToggle}
              disabled={!included}
              aria-label={`Remove ${item.title} from this invoice`}
              title="Remove from invoice"
              className="flex size-11 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-35"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}
