import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { formatDate } from '@/lib/domain/dates';
import { formatInvoiceNumber, getInvoiceStatus } from '@/lib/domain/invoices';
import { formatMoney } from '@/lib/domain/money';
import type { InvoiceListItem } from '@/lib/domain/types';
import { InvoiceStatusBadge } from './InvoiceStatusBadge';

const HEADINGS = ['Invoice', 'Issued', 'Status', 'Total', 'Due', 'Paid'];

/** A table on larger screens and cards on phones. The caller owns scrolling. */
export function InvoicesTable({
  invoices,
  projectId,
}: {
  invoices: InvoiceListItem[];
  projectId: string;
}) {
  const hrefFor = (id: string) => `/projects/${projectId}/invoices/${id}`;

  return (
    <>
      <div className="hidden overflow-hidden rounded-2xl border border-border bg-secondary md:block">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Invoices for this project</caption>
          <thead>
            <tr className="border-b border-border bg-accent text-[10px] uppercase tracking-[0.14em] text-accent-foreground">
              {HEADINGS.map((heading) => (
                <th
                  key={heading}
                  scope="col"
                  className={`px-4 py-3 font-semibold ${heading === 'Total' ? 'text-right' : ''}`}
                >
                  {heading}
                </th>
              ))}
              <th scope="col" className="px-4 py-3">
                <span className="sr-only">Open</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr
                key={invoice.id}
                className="border-b border-border last:border-0 hover:bg-background"
              >
                <td className="px-4 py-3 align-middle">
                  <Link
                    href={hrefFor(invoice.id)}
                    className="font-medium text-foreground hover:text-primary hover:underline"
                  >
                    {formatInvoiceNumber(invoice.number)}
                  </Link>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {invoice.lineItemCount}{' '}
                    {invoice.lineItemCount === 1 ? 'item' : 'items'}
                  </span>
                </td>
                <td className="px-4 py-3 align-middle text-muted-foreground">
                  {formatDate(invoice.createdAt)}
                </td>
                <td className="px-4 py-3 align-middle">
                  <InvoiceStatusBadge status={getInvoiceStatus(invoice)} />
                </td>
                <td className="px-4 py-3 text-right align-middle font-medium tabular-nums">
                  {formatMoney(invoice.totalCents)}
                </td>
                <td className="px-4 py-3 align-middle text-muted-foreground">
                  {formatDate(invoice.dueAt)}
                </td>
                <td className="px-4 py-3 align-middle text-muted-foreground">
                  {formatDate(invoice.paidAt)}
                </td>
                <td className="px-4 py-3 text-right align-middle">
                  <Link
                    href={hrefFor(invoice.id)}
                    aria-label={`Open invoice ${formatInvoiceNumber(invoice.number)}`}
                    className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-primary"
                  >
                    <ArrowUpRight className="size-4" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-3 md:hidden">
        {invoices.map((invoice) => (
          <li key={invoice.id}>
            <Link
              href={hrefFor(invoice.id)}
              className="block rounded-2xl border border-border bg-secondary p-4 transition-colors hover:bg-accent"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">
                    {formatInvoiceNumber(invoice.number)}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Issued {formatDate(invoice.createdAt)}
                  </p>
                </div>
                <InvoiceStatusBadge status={getInvoiceStatus(invoice)} />
              </div>
              <div className="mt-3 flex items-end justify-between gap-3 border-t border-border pt-3">
                <div className="text-xs text-muted-foreground">
                  <p>Due {formatDate(invoice.dueAt)}</p>
                  <p>Paid {formatDate(invoice.paidAt)}</p>
                </div>
                <p className="font-serif text-xl tabular-nums">
                  {formatMoney(invoice.totalCents)}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
