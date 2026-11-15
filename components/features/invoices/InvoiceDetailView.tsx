'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Download, Mail } from 'lucide-react';
import { markInvoicePaid, markInvoiceSent } from '@/lib/actions/invoices';
import { useAction } from '@/lib/actions/use-action';
import { BILLABLE_KIND_LABELS } from '@/lib/domain/billing';
import { formatDate } from '@/lib/domain/dates';
import { buildInvoiceEmail } from '@/lib/domain/invoice-email';
import {
  formatInvoiceNumber,
  getInvoiceStatus,
  invoicePdfFilename,
  type InvoiceStatus,
} from '@/lib/domain/invoices';
import { formatMoney } from '@/lib/domain/money';
import type { InvoiceDetail } from '@/lib/domain/types';
import { cn } from '@/lib/utils';
import { FlowBack, FlowBody, FlowFooter } from '@/components/layout/FlowPanel';
import { Alert } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Toast, useNotice } from '@/components/ui/toast';
import { InvoiceDocument } from './InvoiceDocument';
import { useInvoiceHandoff } from './useInvoiceHandoff';

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

/** `afterHandoff` asks whether a just-drafted email actually went out. */
interface Confirming {
  step: Confirmation;
  afterHandoff?: boolean;
}

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
  clientEmail,
  paymentTermsDays,
  editProjectHref,
  closeHref,
}: {
  invoice: InvoiceDetail;
  /** Read live from the project, so an email added later is used right away. */
  clientEmail: string;
  paymentTermsDays: number;
  editProjectHref: string;
  closeHref: string;
}) {
  const [confirming, setConfirming] = useState<Confirming | null>(null);
  const { run, pending, error } = useAction();
  const [notice, setNotice] = useNotice(6000);

  const status = getInvoiceStatus(invoice);
  const number = formatInvoiceNumber(invoice.number);
  const nextStep = NEXT_STEP[status];
  const confirmation = confirming && CONFIRMATIONS[confirming.step];
  const canEmail = status !== 'Paid';

  const pdfHref = `/api/invoices/${invoice.id}/pdf`;
  const handOff = useInvoiceHandoff({
    pdfHref,
    filename: invoicePdfFilename(invoice.number),
    onRecipientCopied: (email) =>
      setNotice({ tone: 'success', text: `Copied ${email}. Paste it into To:` }),
  });

  async function emailInvoice() {
    const result = await handOff(
      buildInvoiceEmail({
        number: invoice.number,
        clientName: invoice.clientName,
        projectName: invoice.projectName,
        totalCents: invoice.totalCents,
        dueAt: invoice.dueAt,
        paymentTermsDays,
        paymentNote: invoice.paymentNote,
        fromName: invoice.fromName,
        clientEmail,
      })
    );
    // Marking sent stays the designer's call: they may discard the draft.
    if (result !== 'cancelled' && status === 'Issued') {
      setConfirming({ step: 'sent', afterHandoff: true });
    }
  }

  return (
    <>
      <FlowBody>
        <div>
          <FlowBack href={closeHref} />
        </div>
        <InvoiceDocument
          label={`Invoice ${number}`}
          style={invoice.style}
          from={{ name: invoice.fromName, details: invoice.fromDetails }}
          paymentNote={invoice.paymentNote}
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
        {canEmail && !clientEmail && (
          <p className="mt-3 text-label text-muted-foreground">
            No email on file for {invoice.clientName}.{' '}
            <Link href={editProjectHref} className="text-foreground underline underline-offset-4">
              Add one
            </Link>
          </p>
        )}
        {error && !confirmation && <Alert className="mt-3">{error}</Alert>}
      </FlowBody>

      <FlowFooter>
        <a
          href={pdfHref}
          download
          className={cn(
            buttonVariants({ variant: 'outline', size: 'xl' }),
            canEmail && 'max-md:w-13 max-md:flex-none max-md:px-0'
          )}
        >
          {canEmail && <Download className="md:hidden" aria-hidden="true" />}
          <span className={cn(canEmail && 'max-md:sr-only')}>Download PDF</span>
        </a>
        {canEmail && (
          <Button
            type="button"
            size="xl"
            variant={status === 'Issued' ? 'default' : 'outline'}
            disabled={pending}
            onClick={emailInvoice}
            className="max-md:px-3"
          >
            <Mail className="max-md:hidden" aria-hidden="true" />
            Email invoice
          </Button>
        )}
        {nextStep && (
          <Button
            type="button"
            size="xl"
            variant={nextStep === 'sent' ? 'outline' : 'default'}
            disabled={pending}
            onClick={() => setConfirming({ step: nextStep })}
            className="max-md:px-3"
          >
            {CONFIRMATIONS[nextStep].label}
          </Button>
        )}
      </FlowFooter>

      <Toast notice={notice} />

      {confirmation && (
        <ConfirmDialog
          title={
            confirming.afterHandoff
              ? `Did you send ${number}?`
              : `${confirmation.label} ${number}?`
          }
          description={confirmation.description}
          confirmLabel={confirmation.label}
          cancelLabel={confirming.afterHandoff ? 'Not yet' : undefined}
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
