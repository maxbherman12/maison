'use client';

import { useMemo, useState } from 'react';
import { ChevronRight, Search, X } from 'lucide-react';
import {
  BILLABLE_KIND_LABELS,
  totalCents,
  type BillableItem,
} from '@/lib/domain/billing';
import { formatDate } from '@/lib/domain/dates';
import { FURNITURE_STATUSES } from '@/lib/domain/furniture';
import { formatMoney } from '@/lib/domain/money';
import { cn } from '@/lib/utils';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { FURNITURE_STATUS_META } from '@/components/features/furniture/furniture-status';

const KIND_TONES: Record<BillableItem['kind'], BadgeTone> = {
  hours: 'success',
  charge: 'neutral',
  furniture: 'brand',
};

function detail(item: BillableItem): string {
  return item.kind === 'furniture' ? item.vendor : formatDate(item.date);
}

function status(item: BillableItem) {
  return item.kind === 'furniture' ? item.status : null;
}

function hours(item: BillableItem) {
  return item.kind === 'hours' ? item.hours : null;
}

function searchText(item: BillableItem): string {
  return [BILLABLE_KIND_LABELS[item.kind], item.title, detail(item), status(item), hours(item)]
    .filter((part) => part !== null && part !== '')
    .join(' ')
    .toLowerCase();
}

type SortValue = string | number | null;

const COLUMNS = {
  kind: { label: 'Type', value: (item: BillableItem) => BILLABLE_KIND_LABELS[item.kind] },
  title: { label: 'Description', value: (item: BillableItem) => item.title },
  detail: {
    label: 'Detail',
    value: (item: BillableItem) => (item.kind === 'furniture' ? item.vendor : item.date),
  },
  status: {
    label: 'Status',
    value: (item: BillableItem) => {
      const value = status(item);
      return value === null ? null : FURNITURE_STATUSES.indexOf(value);
    },
  },
  hours: { label: 'Hours', value: hours },
  amount: { label: 'Amount', value: (item: BillableItem) => item.amountCents },
} satisfies Record<string, { label: string; value: (item: BillableItem) => SortValue }>;

type ColumnKey = keyof typeof COLUMNS;
type Sort = { column: ColumnKey; direction: 1 | -1 };

/** Empty cells sort last in either direction. */
function compare(a: SortValue, b: SortValue, direction: 1 | -1): number {
  if (a === null || a === '') return b === null || b === '' ? 0 : 1;
  if (b === null || b === '') return -1;
  if (typeof a === 'number' && typeof b === 'number') return (a - b) * direction;
  return String(a).localeCompare(String(b)) * direction;
}

function SortableHeader({
  column,
  sort,
  onSort,
  align = 'left',
}: {
  column: ColumnKey;
  sort: Sort | null;
  onSort: (column: ColumnKey) => void;
  align?: 'left' | 'right';
}) {
  const active = sort?.column === column;
  const ariaSort = !active
    ? 'none'
    : sort.direction === 1
      ? 'ascending'
      : 'descending';

  return (
    <th
      scope="col"
      aria-sort={ariaSort}
      className={cn('px-4 py-3 font-semibold', align === 'right' && 'text-right')}
    >
      <button
        type="button"
        onClick={() => onSort(column)}
        className="uppercase tracking-[0.14em] hover:underline"
      >
        {COLUMNS[column].label}
        {active && <span aria-hidden="true"> {sort.direction === 1 ? '↑' : '↓'}</span>}
      </button>
    </th>
  );
}

interface PendingItemsTableProps {
  items: BillableItem[];
  onOpen: (item: BillableItem) => void;
}

/** Everything waiting to be billed. Owns its scroll inside a `min-h-0` parent. */
export function PendingItemsTable({ items, onOpen }: PendingItemsTableProps) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort | null>(null);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matches = needle
      ? items.filter((item) => searchText(item).includes(needle))
      : items;

    if (!sort) return matches;
    const { value } = COLUMNS[sort.column];
    return [...matches].sort((a, b) => compare(value(a), value(b), sort.direction));
  }, [items, query, sort]);

  const toggleSort = (column: ColumnKey) =>
    setSort((current) =>
      current?.column === column
        ? { column, direction: current.direction === 1 ? -1 : 1 }
        : { column, direction: 1 }
    );

  if (items.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-6 text-center">
        <p className="font-serif text-xl">Nothing pending</p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
          Everything logged on this project has been invoiced. Log more work to
          see it here.
        </p>
      </div>
    );
  }

  const total = formatMoney(totalCents(visible));
  const headerProps = { sort, onSort: toggleSort };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-3 flex shrink-0 items-center justify-end">
        <label className="flex h-10 w-full items-center gap-2 rounded-xl border border-border bg-secondary px-3 transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15 sm:w-64">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <span className="sr-only">Search pending items</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search items"
            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/70 [&::-webkit-search-cancel-button]:appearance-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </label>
      </div>

      <div className="hidden min-h-0 overflow-y-auto overscroll-contain rounded-2xl border border-border bg-card md:block">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Items waiting to be invoiced</caption>
          <thead className="sticky top-0 z-10 bg-accent text-[10px] text-accent-foreground">
            <tr>
              <SortableHeader column="kind" {...headerProps} />
              <SortableHeader column="title" {...headerProps} />
              <SortableHeader column="detail" {...headerProps} />
              <SortableHeader column="status" {...headerProps} />
              <SortableHeader column="hours" align="right" {...headerProps} />
              <SortableHeader column="amount" align="right" {...headerProps} />
              <th scope="col" className="w-12">
                <span className="sr-only">Open</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((item) => {
              const itemStatus = status(item);

              return (
                <tr
                  key={item.id}
                  onClick={() => onOpen(item)}
                  className="cursor-pointer border-t border-border hover:bg-secondary"
                >
                  <td className="px-4 py-3">
                    <Badge tone={KIND_TONES[item.kind]}>
                      {BILLABLE_KIND_LABELS[item.kind]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-medium">{item.title}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {detail(item) || '—'}
                  </td>
                  <td className="px-4 py-3">
                    {itemStatus ? (
                      <Badge tone={FURNITURE_STATUS_META[itemStatus].tone}>
                        {itemStatus}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground/70">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                    {hours(item) ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums">
                    {formatMoney(item.amountCents)}
                  </td>
                  <td className="pr-2 text-right">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onOpen(item);
                      }}
                      aria-label={`Open ${item.title}`}
                      className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-primary"
                    >
                      <ChevronRight className="size-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="sticky bottom-0 bg-accent font-semibold">
            <tr>
              <td colSpan={5} className="px-4 py-3">
                Pending total
              </td>
              <td className="px-4 py-3 text-right tabular-nums">{total}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      <ul className="min-h-0 space-y-2 overflow-y-auto overscroll-contain md:hidden">
        {visible.map((item) => {
          const itemStatus = status(item);
          const subLine = [
            detail(item),
            item.kind === 'hours' ? `${item.hours} hrs` : null,
            itemStatus,
          ]
            .filter(Boolean)
            .join(' · ');

          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onOpen(item)}
                className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left"
              >
                <span className="min-w-0 flex-1">
                  <Badge tone={KIND_TONES[item.kind]}>
                    {BILLABLE_KIND_LABELS[item.kind]}
                  </Badge>
                  <span className="mt-1 block truncate text-sm font-medium">
                    {item.title}
                  </span>
                  {subLine && (
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {subLine}
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-sm font-medium tabular-nums">
                  {formatMoney(item.amountCents)}
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground/60" />
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mt-2 flex shrink-0 justify-between rounded-xl bg-accent px-3 py-2.5 text-sm font-semibold md:hidden">
        <span>Pending total</span>
        <span className="tabular-nums">{total}</span>
      </div>
    </div>
  );
}
