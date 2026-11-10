'use client';

import { useState } from 'react';
import { markInvoicePaid, markInvoiceSent } from '@/lib/actions/invoices';
import { useAction } from '@/lib/actions/use-action';
import { BILLABLE_KIND_LABELS } from '@/lib/domain/billing';
import { formatDate } from '@/lib/domain/dates';
import {
  formatInvoiceNumber,
  getInvoiceStatus,
  type InvoiceStatus,
} from '@/lib/domain/invoices';
import { formatMoney } from '@/lib/domain/money';
import type { InvoiceDetail } from '@/lib/domain/types';
import { cn } from '@/lib/utils';
import { FlowBack, FlowBody, FlowFooter } from '@/components/layout/FlowPanel';
import { Alert } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { InvoiceDocument } from './InvoiceDocument';

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

const NEXT_STEP: Record<InvoiceStatus, Confirmation | null> = {
  Issued: 'sent',
  Sent: 'paid',
  Overdue: 'paid',
  Paid: null,
};

function statusLine(invoice: InvoiceDetail, status: InvoiceStatus): string {
  switch (status) {
    case 'Issued':
      return 'Not sent yet';
    case 'Sent':
      return `Due ${formatDate(invoice.dueAt)}`;
    case 'Overdue':
      return `Overdue since ${formatDate(invoice.dueAt)}`;
    case 'Paid':
      return `Paid ${formatDate(invoice.paidAt)}`;
  }
}

export function InvoiceDetailView({
  invoice,
  closeHref,
}: {
  invoice: InvoiceDetail;
  closeHref: string;
}) {
  const [confirming, setConfirming] = useState<Confirmation | null>(null);
  const { run, pending, error } = useAction();

  const status = getInvoiceStatus(invoice);
  const number = formatInvoiceNumber(invoice.number);
  const nextStep = NEXT_STEP[status];
  const confirmation = confirming && CONFIRMATIONS[confirming];

  return (
    <>
      <FlowBody>
        <div>
          <FlowBack href={closeHref} />
        </div>
        <InvoiceDocument
          label={`Invoice ${number}`}
          billTo={{
            client: invoice.clientName,
            project: invoice.projectName,
            address: invoice.address,
          }}
          side={
            <>
              Issued
              <b className="block text-base font-medium text-foreground">
                {formatDate(invoice.createdAt)}
              </b>
              <span
                className={cn(
                  'inline-flex items-center gap-1.5',
                  status === 'Overdue' && 'text-destructive'
                )}
              >
                {status === 'Overdue' && (
                  <i className="size-2 rounded-full bg-destructive" aria-hidden="true" />
                )}
                {statusLine(invoice, status)}
              </span>
            </>
          }
          totalCents={invoice.totalCents}
        >
          {invoice.lineItems.map((item) => (
            <div key={item.id} className="flex items-center gap-3 py-1.5">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{item.title}</span>
                <span className="block text-label text-muted-foreground">
                  {BILLABLE_KIND_LABELS[item.kind]}
                </span>
              </span>
              <span className="shrink-0 tabular-nums">
                {formatMoney(item.amountCents)}
              </span>
            </div>
          ))}
        </InvoiceDocument>
        {error && !confirmation && <Alert className="mt-3">{error}</Alert>}
      </FlowBody>

      <FlowFooter>
        <a
          href={`/api/invoices/${invoice.id}/pdf`}
          download
          className={buttonVariants({ variant: 'outline', size: 'xl' })}
        >
          Download PDF
        </a>
        {nextStep && (
          <Button
            type="button"
            size="xl"
            disabled={pending}
            onClick={() => setConfirming(nextStep)}
          >
            {CONFIRMATIONS[nextStep].label}
          </Button>
        )}
      </FlowFooter>

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
    </>
  );
}
