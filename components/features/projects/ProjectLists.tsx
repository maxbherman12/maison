'use client';

import { useOptimistic, useTransition, type ReactNode } from 'react';
import Link from 'next/link';
import { Check, ChevronDown, ChevronRight } from 'lucide-react';
import { moveFurniture } from '@/lib/actions/furniture';
import { buildBillableItems } from '@/lib/domain/billing';
import { formatDate } from '@/lib/domain/dates';
import {
  FURNITURE_STATUSES,
  FURNITURE_STATUS_LABELS,
  type FurnitureStatus,
} from '@/lib/domain/furniture';
import { formatInvoiceNumber, getInvoiceStatus } from '@/lib/domain/invoices';
import { formatMoney } from '@/lib/domain/money';
import type { InvoiceListItem, ProjectDetail } from '@/lib/domain/types';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Toast, useNotice } from '@/components/ui/toast';

const ROW_CLASS = 'group flex min-h-14 min-w-0 flex-1 items-center gap-2.5 py-1.5';

function RowText({ title, detail }: { title: string; detail: ReactNode }) {
  return (
    <span className="min-w-0 flex-1">
      <span className="block truncate font-medium md:group-hover:underline md:group-hover:underline-offset-3">
        {title}
      </span>
      <span className="block truncate text-label text-muted-foreground">
        {detail}
      </span>
    </span>
  );
}

function Chevron() {
  return (
    <ChevronRight
      className="size-3 shrink-0 text-muted-foreground/60"
      aria-hidden="true"
    />
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="py-3.5 text-muted-foreground">{children}</p>;
}

/** Logged time and charges still waiting to be invoiced. */
export function TimeList({ project }: { project: ProjectDetail }) {
  const items = buildBillableItems(project).filter(
    (item) => item.kind !== 'furniture'
  );
  if (items.length === 0) {
    return <Empty>No time or charges waiting to be invoiced.</Empty>;
  }

  return (
    <ul>
      {items.map((item) => (
        <li key={item.id}>
          <Link
            href={`/projects/${project.id}/items/${item.id}`}
            className={ROW_CLASS}
          >
            <RowText
              title={item.title}
              detail={`${formatDate(item.date)} · ${
                item.kind === 'hours' ? `${item.hours} hours` : 'Charge'
              }`}
            />
            <span className="shrink-0 tabular-nums">
              {formatMoney(item.amountCents)}
            </span>
            <Chevron />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function StatusPips({ status }: { status: FurnitureStatus }) {
  const reached = FURNITURE_STATUSES.indexOf(status);

  return (
    <span className="flex gap-[3px]" aria-hidden="true">
      {FURNITURE_STATUSES.map((stage, index) => (
        <i
          key={stage}
          className={cn('h-[3px] w-3.25', index <= reached ? 'bg-primary' : 'bg-border')}
        />
      ))}
    </span>
  );
}

export function FurnitureList({ project }: { project: ProjectDetail }) {
  const [notice, setNotice] = useNotice();
  const [, startTransition] = useTransition();
  const [furniture, moveOptimistically] = useOptimistic(
    project.furniture,
    (items, move: { id: string; status: FurnitureStatus }) =>
      items.map((item) =>
        item.id === move.id ? { ...item, status: move.status } : item
      )
  );

  const move = (id: string, status: FurnitureStatus) =>
    startTransition(async () => {
      moveOptimistically({ id, status });
      const result = await moveFurniture(id, status);
      if (!result.ok) setNotice({ tone: 'error', text: result.error });
    });

  if (furniture.length === 0) return <Empty>No furniture yet.</Empty>;

  return (
    <>
      <ul>
        {furniture.map((item) => (
          <li key={item.id} className="flex items-center gap-2">
            <Link
              href={`/projects/${project.id}/items/${item.id}`}
              className={ROW_CLASS}
            >
              <RowText
                title={item.name}
                detail={[
                  item.invoiceId
                    ? 'Invoiced'
                    : `${formatMoney(item.tradeCents)} to invoice`,
                  item.vendor,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              />
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label={`Status: ${FURNITURE_STATUS_LABELS[item.status]}. Change status`}
                className="grid min-h-11 shrink-0 content-center justify-items-end gap-1 text-label whitespace-nowrap"
              >
                <span className="inline-flex items-center gap-[3px]">
                  {FURNITURE_STATUS_LABELS[item.status]}
                  <ChevronDown className="size-3" aria-hidden="true" />
                </span>
                <StatusPips status={item.status} />
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {FURNITURE_STATUSES.map((status) => (
                  <DropdownMenuItem
                    key={status}
                    onClick={() => move(item.id, status)}
                  >
                    <span className="flex-1">
                      {FURNITURE_STATUS_LABELS[status]}
                    </span>
                    {status === item.status && (
                      <Check className="text-muted-foreground" aria-label="Current status" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </li>
        ))}
      </ul>
      <Toast notice={notice} />
    </>
  );
}

export function InvoiceList({
  projectId,
  invoices,
}: {
  projectId: string;
  invoices: InvoiceListItem[];
}) {
  if (invoices.length === 0) return <Empty>No invoices yet.</Empty>;

  return (
    <ul>
      {invoices.map((invoice) => {
        const status = getInvoiceStatus(invoice);

        return (
          <li key={invoice.id}>
            <Link
              href={`/projects/${projectId}/invoices/${invoice.id}`}
              className={ROW_CLASS}
            >
              <RowText
                title={`Invoice ${formatInvoiceNumber(invoice.number)}`}
                detail={`${formatDate(invoice.createdAt)} · ${formatMoney(invoice.totalCents)}`}
              />
              <span
                className={cn(
                  'inline-flex shrink-0 items-center gap-1.5 text-label',
                  status === 'Overdue' ? 'text-destructive' : 'text-muted-foreground'
                )}
              >
                {status === 'Overdue' && (
                  <i className="size-2 rounded-full bg-destructive" aria-hidden="true" />
                )}
                {status}
              </span>
              <Chevron />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
