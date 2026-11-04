'use client';

import type { Invoice, Project } from '@/lib/types';
import { formatMoney } from '@/lib/types';
import { formatDate } from '@/lib/format-date';
import { getInvoiceStatus } from '@/lib/invoices/status';
import {
  useInvoice,
  useMarkInvoicePaid,
  useMarkInvoiceSent,
} from '@/lib/query/invoices';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Download, FileText, Send } from 'lucide-react';
import { InvoiceStatusBadge } from './InvoiceStatusBadge';

interface InvoiceDetailProps {
  project: Project;
  invoice: Invoice;
}

export function InvoiceDetail({ project, invoice }: InvoiceDetailProps) {
  const { data: liveInvoice = invoice } = useInvoice(invoice.id, invoice);
  const markSent = useMarkInvoiceSent();
  const markPaid = useMarkInvoicePaid();

  const status = getInvoiceStatus(liveInvoice);
  const lineItems = liveInvoice.lineItems ?? [];
  const isPending = markSent.isPending || markPaid.isPending;
  const error =
    markSent.error instanceof Error
      ? markSent.error.message
      : markPaid.error instanceof Error
        ? markPaid.error.message
        : null;

  const handleMarkSent = () => {
    if (
      !window.confirm(
        `Mark ${liveInvoice.number} as sent? This sets the due date and cannot be undone.`
      )
    ) {
      return;
    }
    markSent.mutate(liveInvoice.id);
  };

  const handleMarkPaid = () => {
    if (
      !window.confirm(
        `Mark ${liveInvoice.number} as paid? This cannot be undone.`
      )
    ) {
      return;
    }
    markPaid.mutate(liveInvoice.id);
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-[#99998e]">
            {project.client} — {project.project}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="font-serif text-3xl leading-tight sm:text-4xl">
              {liveInvoice.number}
            </h1>
            <InvoiceStatusBadge status={status} />
          </div>
          <p className="mt-2 text-sm text-[#85857a]">
            Issued {formatDate(liveInvoice.createdAt)}
          </p>
        </div>

        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          {status === 'Issued' && (
            <Button
              type="button"
              onClick={handleMarkSent}
              disabled={isPending}
              className="h-11 rounded-xl bg-[#bd765b] px-4 text-white hover:bg-[#a9573d]"
            >
              <Send className="size-4" />
              {markSent.isPending ? 'Saving...' : 'Mark sent'}
            </Button>
          )}
          {(status === 'Sent' || status === 'Overdue') && (
            <Button
              type="button"
              onClick={handleMarkPaid}
              disabled={isPending}
              className="h-11 rounded-xl bg-[#7f8f72] px-4 text-white hover:bg-[#6d7c61]"
            >
              <CheckCircle2 className="size-4" />
              {markPaid.isPending ? 'Saving...' : 'Mark paid'}
            </Button>
          )}
          {status === 'Paid' && (
            <span className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#dbe1d4] px-4 text-sm font-medium text-[#5b6753]">
              <CheckCircle2 className="size-4" /> Paid
            </span>
          )}
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-xl border border-[#c98973] bg-[#fbf0eb] px-4 py-3 text-sm text-[#a9573d]">
          {error}
        </p>
      )}

      <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
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

      <article
        aria-label={`Invoice ${liveInvoice.number}`}
        className="mt-7 rounded-3xl border border-[#deddd5] bg-[#fffefa] p-5 shadow-[0_18px_50px_-35px_rgba(41,41,35,0.45)] sm:p-8"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#e9e7df] pb-6">
          <div>
            <p className="font-serif text-2xl">Maison</p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-[#99998e]">
              Interior design
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium">{liveInvoice.number}</p>
            <p className="text-xs text-[#85857a]">
              {formatDate(liveInvoice.createdAt)}
            </p>
          </div>
        </div>

        <div className="grid gap-6 border-b border-[#e9e7df] py-6 sm:grid-cols-2">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#99998e]">
              Bill to
            </p>
            <p className="mt-2 text-lg font-medium">{project.client}</p>
            <p className="text-sm text-[#85857a]">{project.project}</p>
            {project.address && (
              <p className="mt-1 whitespace-pre-wrap text-sm text-[#85857a]">
                {project.address}
              </p>
            )}
          </div>
          <div className="sm:text-right">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#99998e]">
              {status === 'Paid' ? 'Paid in full' : 'Amount due'}
            </p>
            <p className="mt-2 font-serif text-3xl">
              {formatMoney(liveInvoice.total)}
            </p>
          </div>
        </div>

        <div className="pt-6">
          {lineItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#deddd5] bg-[#fbfaf7] px-5 py-8 text-center">
              <p className="font-serif text-xl">Legacy invoice</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-[#85857a]">
                Line items are unavailable for this invoice. The recorded total
                is {formatMoney(liveInvoice.total)}.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">
                  Line items for invoice {liveInvoice.number}
                </caption>
                <thead>
                  <tr className="border-b border-[#e9e7df] text-[10px] uppercase tracking-[0.14em] text-[#99998e]">
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
                      className="border-b border-[#f0eee7] last:border-0"
                    >
                      <td className="py-3 pr-4 align-top">
                        <span className="block font-medium">{item.title}</span>
                        <span className="mt-0.5 block text-[11px] uppercase tracking-[0.1em] text-[#99998e]">
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

        <div className="mt-6 flex items-end justify-between gap-4 border-t border-[#e9e7df] pt-5">
          <p className="max-w-[34ch] text-xs leading-relaxed text-[#85857a]">
            This invoice records the line items as they were when it was
            generated.
          </p>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[#99998e]">
              Total
            </p>
            <p className="mt-1 font-serif text-3xl leading-none">
              {formatMoney(liveInvoice.total)}
            </p>
          </div>
        </div>
      </article>

      <div className="mt-5 flex flex-wrap gap-3">
        <a
          href={`/api/invoices/${liveInvoice.id}/pdf`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#deddd5] bg-[#fbfaf7] px-4 text-sm text-[#bd765b] transition-colors hover:bg-[#f1e6df]"
        >
          <FileText className="size-4" /> View PDF
        </a>
        <a
          href={`/api/invoices/${liveInvoice.id}/pdf`}
          download
          className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#deddd5] bg-[#fbfaf7] px-4 text-sm text-[#bd765b] transition-colors hover:bg-[#f1e6df]"
        >
          <Download className="size-4" /> Download PDF
        </a>
      </div>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#ece9e0] px-4 py-4">
      <span className="block text-[10px] uppercase tracking-[0.12em] text-[#99998e]">
        {label}
      </span>
      <strong className="mt-1.5 block font-serif text-xl font-normal">
        {value}
      </strong>
    </div>
  );
}
