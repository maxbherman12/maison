'use client';

import { Pencil, X } from 'lucide-react';
import type { BillableRow } from '@/lib/billing';
import { billableRowKey } from '@/lib/billing';
import { formatMoney } from '@/lib/types';
import { formatDate } from '@/lib/format-date';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface InvoiceItemSidebarProps {
  rows: BillableRow[];
  includedKeys: ReadonlySet<string>;
  total: number;
  onToggle: (key: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  onEdit: (row: BillableRow) => void;
}

export function InvoiceItemSidebar({
  rows,
  includedKeys,
  total,
  onToggle,
  onSelectAll,
  onClearAll,
  onEdit,
}: InvoiceItemSidebarProps) {
  const includedCount = rows.filter((row) =>
    includedKeys.has(billableRowKey(row))
  ).length;
  const hourRows = rows.filter((row) => row.source === 'hours');
  const furnitureRows = rows.filter((row) => row.source === 'furniture');

  return (
    <div className="rounded-3xl border border-border bg-secondary p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl">Items</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {includedCount} of {rows.length} included
          </p>
        </div>
        <p className="font-serif text-xl tabular-nums">{formatMoney(total)}</p>
      </div>

      <div className="mt-3 flex items-center gap-4 text-xs font-medium text-primary">
        <button
          type="button"
          onClick={onSelectAll}
          className="transition-colors hover:text-accent-foreground hover:underline"
        >
          Select all
        </button>
        <button
          type="button"
          onClick={onClearAll}
          className="transition-colors hover:text-accent-foreground hover:underline"
        >
          Clear all
        </button>
      </div>

      <div className="mt-5 space-y-6">
        {hourRows.length > 0 && (
          <ItemGroup
            title="Hours"
            rows={hourRows}
            includedKeys={includedKeys}
            onToggle={onToggle}
            onEdit={onEdit}
          />
        )}
        {furnitureRows.length > 0 && (
          <ItemGroup
            title="Furniture"
            rows={furnitureRows}
            includedKeys={includedKeys}
            onToggle={onToggle}
            onEdit={onEdit}
          />
        )}
      </div>
    </div>
  );
}

function ItemGroup({
  title,
  rows,
  includedKeys,
  onToggle,
  onEdit,
}: {
  title: string;
  rows: BillableRow[];
  includedKeys: ReadonlySet<string>;
  onToggle: (key: string) => void;
  onEdit: (row: BillableRow) => void;
}) {
  return (
    <section aria-label={`${title} items`}>
      <h3 className="mb-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {title}
      </h3>
      <ul className="space-y-2">
        {rows.map((row) => (
          <ItemRow
            key={row.id}
            row={row}
            included={includedKeys.has(billableRowKey(row))}
            onToggle={() => onToggle(billableRowKey(row))}
            onEdit={() => onEdit(row)}
          />
        ))}
      </ul>
    </section>
  );
}

function ItemRow({
  row,
  included,
  onToggle,
  onEdit,
}: {
  row: BillableRow;
  included: boolean;
  onToggle: () => void;
  onEdit: () => void;
}) {
  const checkboxId = `include-${row.id.replace(/[^a-z0-9-]/gi, '-')}`;
  const detail =
    row.source === 'hours'
      ? [formatDate(row.secondary), row.hours != null ? `${row.hours} hrs` : null]
      : [row.secondary || 'No vendor', row.status];

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
          <label htmlFor={checkboxId} className="block cursor-pointer">
            <Badge className="px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em]">
              {row.type}
            </Badge>
            <span className="mt-1 block truncate text-sm font-medium text-foreground">
              {row.description}
            </span>
          </label>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {detail.filter(Boolean).join(' · ')}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className="text-sm font-medium tabular-nums">
            {formatMoney(row.amount)}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onEdit}
              aria-label={`Edit ${row.description}`}
              title="Edit item"
              className="flex size-11 items-center justify-center rounded-full border border-border text-primary transition-colors hover:bg-accent"
            >
              <Pencil className="size-4" />
            </button>
            <button
              type="button"
              onClick={onToggle}
              disabled={!included}
              aria-label={`Remove ${row.description} from this invoice`}
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
