'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { generateInvoice } from '@/lib/actions/invoices';
import { useAction } from '@/lib/actions/use-action';
import {
  buildBillableItems,
  totalCents,
  type BillableItem,
} from '@/lib/domain/billing';
import { formatDate } from '@/lib/domain/dates';
import { formatMoney } from '@/lib/domain/money';
import type { ProjectDetail } from '@/lib/domain/types';
import { cn } from '@/lib/utils';
import { Confirmation } from '@/components/layout/Confirmation';
import { FlowBack, FlowBody, FlowFooter } from '@/components/layout/FlowPanel';
import { Alert } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import { InvoiceDocument } from './InvoiceDocument';

function itemDetail(item: BillableItem): string {
  switch (item.kind) {
    case 'hours':
      return `${formatDate(item.date)} · ${item.hours} hours`;
    case 'charge':
      return formatDate(item.date);
    case 'furniture':
      return [item.vendor, 'trade price'].filter(Boolean).join(' · ');
  }
}

export function InvoiceComposer({
  project,
  issueDate,
}: {
  project: ProjectDetail;
  issueDate: Date;
}) {
  const closeHref = `/projects/${project.id}`;
  const { run, pending, error } = useAction();
  const [excludedIds, setExcludedIds] = useState<ReadonlySet<string>>(new Set());
  const [created, setCreated] = useState<{ id: string; totalCents: number } | null>(null);

  const items = buildBillableItems(project);
  const included = items.filter((item) => !excludedIds.has(item.id));
  const total = totalCents(included);

  const toggle = (id: string) =>
    setExcludedIds((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  if (created) {
    return (
      <Confirmation
        headline={<h2 className="font-serif text-heading font-normal">Invoice created</h2>}
        detail={`${formatMoney(created.totalCents)} for ${project.client}. Download the PDF to send it, then mark it as sent.`}
        footer={
          <>
            <a
              href={`/api/invoices/${created.id}/pdf`}
              download
              className={buttonVariants({ variant: 'onPaintOutline', size: 'xl' })}
            >
              Download PDF
            </a>
            <Link
              href={`${closeHref}/invoices/${created.id}`}
              className={buttonVariants({ variant: 'onPaint', size: 'xl' })}
            >
              View invoice
            </Link>
          </>
        }
      />
    );
  }

  if (items.length === 0) {
    return (
      <FlowBody>
        <div>
          <FlowBack href={closeHref} />
        </div>
        <h2 className="pt-3 pb-2.5 font-serif text-heading font-normal">
          Nothing to invoice
        </h2>
        <p className="text-muted-foreground">
          Everything logged on this project has already been invoiced.
        </p>
      </FlowBody>
    );
  }

  return (
    <>
      <FlowBody>
        <div>
          <FlowBack href={closeHref} />
        </div>
        <InvoiceDocument
          label="Draft"
          billTo={{
            client: project.client,
            project: project.name,
            address: project.address,
          }}
          side={
            <>
              Issued
              <b className="block text-base font-medium text-foreground">
                {formatDate(issueDate)}
              </b>
            </>
          }
          totalCents={total}
        >
          {items.map((item) => {
            const isIncluded = !excludedIds.has(item.id);

            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={isIncluded}
                onClick={() => toggle(item.id)}
                className={cn(
                  'flex w-full items-center gap-3 py-1.5 text-left transition-opacity',
                  !isIncluded && 'opacity-40'
                )}
              >
                <span
                  className={cn(
                    'grid size-5 shrink-0 place-items-center',
                    isIncluded
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-foreground'
                  )}
                >
                  {isIncluded && <Check className="size-3" strokeWidth={3} aria-hidden="true" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      'block truncate font-medium',
                      !isIncluded && 'line-through'
                    )}
                  >
                    {item.title}
                  </span>
                  <span className="block truncate text-label text-muted-foreground">
                    {itemDetail(item)}
                  </span>
                </span>
                <span className="shrink-0 tabular-nums">
                  {formatMoney(item.amountCents)}
                </span>
              </button>
            );
          })}
        </InvoiceDocument>
        <p className="pt-2.5 text-center text-label text-muted-foreground">
          Tap a line to leave it off this invoice.
        </p>
        {error && <Alert className="mt-3">{error}</Alert>}
      </FlowBody>

      <FlowFooter>
        <Button
          type="button"
          size="xl"
          disabled={pending || included.length === 0}
          onClick={() =>
            run(
              () =>
                generateInvoice({
                  projectId: project.id,
                  itemIds: included.map((item) => item.id),
                }),
              ({ id }) => setCreated({ id, totalCents: total })
            )
          }
        >
          {pending ? 'Creating…' : 'Create invoice'}
        </Button>
      </FlowFooter>
    </>
  );
}
