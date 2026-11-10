'use client';

import { useState } from 'react';
import { CheckCircle2, Download, FileText, Send } from 'lucide-react';
import { markInvoicePaid, markInvoiceSent } from '@/lib/actions/invoices';
import { useAction } from '@/lib/actions/use-action';
import { formatDate } from '@/lib/domain/dates';
import { formatInvoiceNumber, getInvoiceStatus } from '@/lib/domain/invoices';
import { formatMoney } from '@/lib/domain/money';
import type { InvoiceDetail } from '@/lib/domain/types';
import { cn } from '@/lib/utils';
import { BackLink } from '@/components/layout/BackLink';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { StatTile } from '@/components/ui/stat-tile';
import { InvoiceDocument } from './InvoiceDocument';
import { InvoiceStatusBadge } from './InvoiceStatusBadge';

const CONFIRMATIONS = {
  sent: {
    description: 'This sets the due date and cannot be undone.',
    label: 'Mark sent',
    tone: 'default',
    action: markInvoiceSent,
  },
  paid: {
    description: 'This cannot be undone.',
    label: 'Mark paid',
    tone: 'success',
    action: markInvoicePaid,
  },
} as const;

type Confirmation = keyof typeof CONFIRMATIONS;

const ICON_LINK_CLASS = cn(
  buttonVariants({ variant: 'outline', size: 'icon' }),
  'text-primary'
);

export function InvoiceDetailView({ invoice }: { invoice: InvoiceDetail }) {
  const [confirming, setConfirming] = useState<Confirmation | null>(null);
  const { run, pending, error } = useAction();

  const status = getInvoiceStatus(invoice);
  const number = formatInvoiceNumber(invoice.number);
  const pdfHref = `/api/invoices/${invoice.id}/pdf`;
  const confirmation = confirming && CONFIRMATIONS[confirming];

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-3 pb-3">
        <BackLink
          href={`/projects/${invoice.projectId}/invoices`}
          label="Invoices"
        />
        <p className="shrink-0 truncate text-sm font-medium">{number}</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
        <div className="flex min-w-0 items-center gap-2">
          <InvoiceStatusBadge status={status} />
          <p className="hidden truncate text-xs text-muted-foreground sm:block">
            {formatDate(invoice.createdAt)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {status === 'Issued' && (
            <Button
              type="button"
              onClick={() => setConfirming('sent')}
              disabled={pending}
              className="h-10 px-3"
            >
              <Send className="size-4" />
              Mark sent
            </Button>
          )}
          {(status === 'Sent' || status === 'Overdue') && (
            <Button
              type="button"
              variant="success"
              onClick={() => setConfirming('paid')}
              disabled={pending}
              className="h-10 px-3"
            >
              <CheckCircle2 className="size-4" />
              Mark paid
            </Button>
          )}
          {status === 'Paid' && (
            <Badge tone="success" className="h-10 gap-1.5 rounded-xl px-3 text-sm">
              <CheckCircle2 className="size-4" /> Paid
            </Badge>
          )}

          <a
            href={pdfHref}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View PDF"
            title="View PDF"
            className={ICON_LINK_CLASS}
          >
            <FileText className="size-4" />
          </a>
          <a
            href={pdfHref}
            download
            aria-label="Download PDF"
            title="Download PDF"
            className={ICON_LINK_CLASS}
          >
            <Download className="size-4" />
          </a>
        </div>
      </div>

      {error && !confirmation && <Alert className="mb-3 shrink-0">{error}</Alert>}

      <div className="grid grid-cols-2 gap-2 pb-3 sm:grid-cols-4">
        <StatTile label="Issued" value={formatDate(invoice.createdAt)} />
        <StatTile
          label="Due"
          value={invoice.dueAt ? formatDate(invoice.dueAt) : 'Not set'}
        />
        <StatTile label="Paid" value={formatDate(invoice.paidAt)} />
        <StatTile label="Total" value={formatMoney(invoice.totalCents)} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
        <InvoiceDocument
          label={`Invoice ${number}`}
          meta={
            <>
              <p className="text-sm font-medium">{number}</p>
              <p className="text-xs text-muted-foreground">
                {formatDate(invoice.createdAt)}
              </p>
            </>
          }
          billTo={{
            client: invoice.clientName,
            project: invoice.projectName,
            address: invoice.address,
          }}
          summary={
            <>
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {status === 'Paid' ? 'Paid in full' : 'Amount due'}
              </p>
              <p className="mt-2 font-serif text-3xl">
                {formatMoney(invoice.totalCents)}
              </p>
            </>
          }
          lineItems={invoice.lineItems}
          footnote="This invoice records the line items as they were when it was generated."
          totalLabel="Total"
          totalCents={invoice.totalCents}
        />
      </div>

      {confirmation && (
        <ConfirmDialog
          title={`${confirmation.label} ${number}?`}
          description={confirmation.description}
          confirmLabel={confirmation.label}
          tone={confirmation.tone}
          pending={pending}
          error={error}
          onClose={() => setConfirming(null)}
          onConfirm={() =>
            run(() => confirmation.action(invoice.id), () => setConfirming(null))
          }
        />
      )}
    </div>
  );
}
