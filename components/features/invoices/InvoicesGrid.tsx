import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Invoice } from '@/lib/types';
import { formatMoney } from '@/lib/types';
import { formatDate } from '@/lib/format-date';
import { getInvoiceStatus } from '@/lib/invoices/status';
import { cn } from '@/lib/utils';
import { InvoiceStatusBadge } from './InvoiceStatusBadge';

interface InvoicesGridProps {
  invoices: Invoice[];
  projectId: string;
  emptyAction?: ReactNode;
  /** Tighter empty state for a viewport panel. */
  compact?: boolean;
  /** Fill the parent height and own the list scroll. */
  fill?: boolean;
}

export function InvoicesGrid({
  invoices,
  projectId,
  emptyAction,
  compact = false,
  fill = false,
}: InvoicesGridProps) {
  if (invoices.length === 0) {
    return (
      <div
        className={cn(
          'text-center',
          fill
            ? 'flex min-h-0 flex-1 flex-col items-center justify-center p-6'
            : cn(
                'rounded-3xl border border-dashed border-[#deddd5] bg-[#fbfaf7]',
                compact ? 'p-5' : 'p-8'
              )
        )}
      >
        <p className={cn('font-serif', compact ? 'text-xl' : 'text-2xl')}>
          No invoices yet
        </p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-[#85857a]">
          Generated invoices appear here with their status, total, and dates.
        </p>
        {emptyAction && (
          <div className={compact ? 'mt-4' : 'mt-5'}>{emptyAction}</div>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        fill && 'min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1'
      )}
    >
      <div className="hidden overflow-hidden rounded-2xl border border-[#deddd5] bg-[#fbfaf7] md:block">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Invoices for this project</caption>
          <thead>
            <tr className="border-b border-[#deddd5] bg-[#f1e6df] text-[10px] uppercase tracking-[0.14em] text-[#6b564a]">
              <th scope="col" className="px-4 py-3 font-semibold">
                Invoice
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Issued
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Status
              </th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">
                Total
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Due
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Paid
              </th>
              <th scope="col" className="px-4 py-3">
                <span className="sr-only">Open</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => {
              const status = getInvoiceStatus(invoice);
              const href = `/projects/${projectId}/invoices/${invoice.id}`;

              return (
                <tr
                  key={invoice.id}
                  className="border-b border-[#e9e7df] last:border-0 hover:bg-[#f7f6f2]"
                >
                  <td className="px-4 py-3 align-middle">
                    <Link
                      href={href}
                      className="font-medium text-[#292923] hover:text-[#bd765b] hover:underline"
                    >
                      {invoice.number}
                    </Link>
                    {typeof invoice.lineItemCount === 'number' && (
                      <span className="mt-0.5 block text-xs text-[#99998e]">
                        {invoice.lineItemCount}{' '}
                        {invoice.lineItemCount === 1 ? 'item' : 'items'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 align-middle text-[#85857a]">
                    {formatDate(invoice.createdAt)}
                  </td>
                  <td className="px-4 py-3 align-middle">
                    <InvoiceStatusBadge status={status} />
                  </td>
                  <td className="px-4 py-3 text-right align-middle font-medium tabular-nums">
                    {formatMoney(invoice.total)}
                  </td>
                  <td className="px-4 py-3 align-middle text-[#85857a]">
                    {formatDate(invoice.dueAt)}
                  </td>
                  <td className="px-4 py-3 align-middle text-[#85857a]">
                    {formatDate(invoice.paidAt)}
                  </td>
                  <td className="px-4 py-3 text-right align-middle">
                    <Link
                      href={href}
                      aria-label={`Open invoice ${invoice.number}`}
                      className="inline-flex size-9 items-center justify-center rounded-full text-[#99998e] transition-colors hover:bg-[#f1e6df] hover:text-[#bd765b]"
                    >
                      <ArrowUpRight className="size-4" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ul className="space-y-3 md:hidden">
        {invoices.map((invoice) => {
          const status = getInvoiceStatus(invoice);

          return (
            <li key={invoice.id}>
              <Link
                href={`/projects/${projectId}/invoices/${invoice.id}`}
                className="block rounded-2xl border border-[#deddd5] bg-[#fbfaf7] p-4 transition-colors hover:bg-[#f1e6df]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{invoice.number}</p>
                    <p className="mt-0.5 text-xs text-[#85857a]">
                      Issued {formatDate(invoice.createdAt)}
                    </p>
                  </div>
                  <InvoiceStatusBadge status={status} />
                </div>
                <div className="mt-3 flex items-end justify-between gap-3 border-t border-[#e9e7df] pt-3">
                  <div className="text-xs text-[#85857a]">
                    <p>Due {formatDate(invoice.dueAt)}</p>
                    <p>Paid {formatDate(invoice.paidAt)}</p>
                  </div>
                  <p className="font-serif text-xl tabular-nums">
                    {formatMoney(invoice.total)}
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
