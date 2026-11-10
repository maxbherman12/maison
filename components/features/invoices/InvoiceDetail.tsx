'use client';

import { useState } from 'react';
import type { Invoice, Project } from '@/lib/types';
import { formatMoney } from '@/lib/types';
import { formatDate } from '@/lib/format-date';
import { getInvoiceStatus } from '@/lib/invoices/status';
import {
  useInvoice,
  useMarkInvoicePaid,
  useMarkInvoiceSent,
} from '@/lib/query/invoices';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { BackLink } from '@/components/layout/BackLink';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { cn } from '@/lib/utils';
import { CheckCircle2, Download, FileText, Send } from 'lucide-react';
import { InvoiceStatusBadge } from './InvoiceStatusBadge';

interface InvoiceDetailProps {
  project: Project;
  invoice: Invoice;
}

type ConfirmAction = 'sent' | 'paid';

export function InvoiceDetail({ project, invoice }: InvoiceDetailProps) {
  const { data: liveInvoice = invoice } = useInvoice(invoice.id, invoice);
  const markSent = useMarkInvoiceSent();
  const markPaid = useMarkInvoicePaid();
  const [confirming, setConfirming] = useState<ConfirmAction | null>(null);

  const status = getInvoiceStatus(liveInvoice);
  const lineItems = liveInvoice.lineItems ?? [];
  const isPending = markSent.isPending || markPaid.isPending;
  const error =
    markSent.error instanceof Error
      ? markSent.error.message
      : markPaid.error instanceof Error
        ? markPaid.error.message
        : null;

  const confirm = () => {
    if (confirming === 'sent') markSent.mutate(liveInvoice.id);
    if (confirming === 'paid') markPaid.mutate(liveInvoice.id);
    setConfirming(null);
  };

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-3 pb-3">
        <BackLink
          href={`/projects/${project.id}/invoices`}
          label="Invoices"
        />
        <p className="shrink-0 truncate text-sm font-medium">
          {liveInvoice.number}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
        <div className="flex min-w-0 items-center gap-2">
          <InvoiceStatusBadge status={status} />
          <p className="hidden truncate text-xs text-muted-foreground sm:block">
            {formatDate(liveInvoice.createdAt)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {status === 'Issued' && (
            <Button
              type="button"
              onClick={() => setConfirming('sent')}
              disabled={isPending}
              className="h-10 px-3"
            >
              <Send className="size-4" />
              {markSent.isPending ? 'Saving...' : 'Mark sent'}
            </Button>
          )}
          {(status === 'Sent' || status === 'Overdue') && (
            <Button
              type="button"
              variant="success"
              onClick={() => setConfirming('paid')}
              disabled={isPending}
              className="h-10 px-3"
            >
              <CheckCircle2 className="size-4" />
              {markPaid.isPending ? 'Saving...' : 'Mark paid'}
            </Button>
          )}
          {status === 'Paid' && (
            <Badge
              tone="success"
              className="h-10 gap-1.5 rounded-xl px-3 text-sm"
            >
              <CheckCircle2 className="size-4" /> Paid
            </Badge>
          )}

          <a
            href={`/api/invoices/${liveInvoice.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View PDF"
            title="View PDF"
            className={cn(
              buttonVariants({ variant: 'outline', size: 'icon' }),
              'text-primary'
            )}
          >
            <FileText className="size-4" />
          </a>
          <a
            href={`/api/invoices/${liveInvoice.id}/pdf`}
            download
            aria-label="Download PDF"
            title="Download PDF"
            className={cn(
              buttonVariants({ variant: 'outline', size: 'icon' }),
              'text-primary'
            )}
          >
            <Download className="size-4" />
          </a>
        </div>
      </div>

      {error && <Alert className="mb-3 shrink-0">{error}</Alert>}

      <div className="grid grid-cols-2 gap-2 pb-3 sm:grid-cols-4">
        <Summary label="Issued" value={formatDate(liveInvoice.createdAt)} />
        <Summary
          label="Due"
          value={liveInvoice.dueAt ? formatDate(liveInvoice.dueAt) : 'Not set'}
        />
        <Summary
          label="Paid"
          value={liveInvoice.paidAt ? formatDate(liveInvoice.paidAt) : '—'}
        />
        <Summary label="Total" value={formatMoney(liveInvoice.total)} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
        <article
          aria-label={`Invoice ${liveInvoice.number}`}
          className="rounded-3xl border border-border bg-card p-4 shadow-[0_18px_50px_-35px_rgba(41,41,35,0.45)] sm:p-6"
        >
          <div className="flex items-start justify-between gap-4 border-b border-border/70 pb-5">
            <div>
              <p className="font-serif text-2xl">Maison</p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Interior design
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">{liveInvoice.number}</p>
              <p className="text-xs text-muted-foreground">
                {formatDate(liveInvoice.createdAt)}
              </p>
            </div>
          </div>

          <div className="grid gap-5 border-b border-border/70 py-5 sm:grid-cols-2">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Bill to
              </p>
              <p className="mt-2 text-lg font-medium">{project.client}</p>
              <p className="text-sm text-muted-foreground">{project.project}</p>
              {project.address && (
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                  {project.address}
                </p>
              )}
            </div>
            <div className="sm:text-right">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {status === 'Paid' ? 'Paid in full' : 'Amount due'}
              </p>
              <p className="mt-2 font-serif text-3xl">
                {formatMoney(liveInvoice.total)}
              </p>
            </div>
          </div>

          <div className="pt-5">
            {lineItems.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-secondary px-5 py-8 text-center">
                <p className="font-serif text-xl">Legacy invoice</p>
                <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                  Line items are unavailable for this invoice. The recorded
                  total is {formatMoney(liveInvoice.total)}.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <caption className="sr-only">
                    Line items for invoice {liveInvoice.number}
                  </caption>
                  <thead>
                    <tr className="border-b border-border/70 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      <th scope="col" className="pb-3 pr-4 font-medium">
                        Description
                      </th>
                      <th
                        scope="col"
                        className="pb-3 pl-4 text-right font-medium"
                      >
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-border/40 last:border-0"
                      >
                        <td className="py-3 pr-4 align-top">
                          <span className="block font-medium">
                            {item.title}
                          </span>
                          <span className="mt-0.5 block text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
                            {item.source === 'hours' ? 'Hours' : 'Furniture'}
                          </span>
                        </td>
                        <td className="py-3 pl-4 text-right align-top font-medium tabular-nums">
                          {formatMoney(item.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="mt-5 flex items-end justify-between gap-4 border-t border-border/70 pt-5">
            <p className="max-w-[34ch] text-xs leading-relaxed text-muted-foreground">
              This invoice records the line items as they were when it was
              generated.
            </p>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                Total
              </p>
              <p className="mt-1 font-serif text-3xl leading-none">
                {formatMoney(liveInvoice.total)}
              </p>
            </div>
          </div>
        </article>
      </div>

      {confirming === 'sent' && (
        <ConfirmDialog
          title={`Mark ${liveInvoice.number} as sent?`}
          description="This sets the due date and cannot be undone."
          confirmLabel="Mark sent"
          pending={markSent.isPending}
          onClose={() => setConfirming(null)}
          onConfirm={confirm}
        />
      )}
      {confirming === 'paid' && (
        <ConfirmDialog
          title={`Mark ${liveInvoice.number} as paid?`}
          description="This cannot be undone."
          confirmLabel="Mark paid"
          tone="success"
          pending={markPaid.isPending}
          onClose={() => setConfirming(null)}
          onConfirm={confirm}
        />
      )}
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-muted px-3 py-2.5">
      <span className="block truncate text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </span>
      <strong className="mt-0.5 block truncate font-serif text-sm font-normal sm:text-base">
        {value}
      </strong>
    </div>
  );
}
