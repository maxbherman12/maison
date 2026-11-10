import type { ReactNode } from 'react';
import { BILLABLE_KIND_LABELS, type BillableKind } from '@/lib/domain/billing';
import { formatMoney } from '@/lib/domain/money';

interface InvoiceDocumentProps {
  label: string;
  /** Top-right of the letterhead: number or draft status, and date. */
  meta: ReactNode;
  billTo: { client: string; project: string; address: string };
  /** Right-hand block next to the bill-to details. */
  summary: ReactNode;
  lineItems: readonly {
    id: string;
    kind: BillableKind;
    title: string;
    amountCents: number;
  }[];
  emptyState?: ReactNode;
  footnote: string;
  totalLabel: string;
  totalCents: number;
}

/** The on-screen invoice, shared by the draft preview and generated invoices. */
export function InvoiceDocument({
  label,
  meta,
  billTo,
  summary,
  lineItems,
  emptyState,
  footnote,
  totalLabel,
  totalCents,
}: InvoiceDocumentProps) {
  return (
    <article
      aria-label={label}
      className="rounded-3xl border border-border bg-card p-4 shadow-[0_18px_50px_-35px_rgba(41,41,35,0.45)] sm:p-6 lg:p-8"
    >
      <header className="flex items-start justify-between gap-4 border-b border-border/70 pb-6">
        <div>
          <p className="font-serif text-3xl tracking-tight">Maison</p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Interior design
          </p>
        </div>
        <div className="text-right">{meta}</div>
      </header>

      <div className="grid gap-6 border-b border-border/70 py-6 sm:grid-cols-2">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Bill to
          </p>
          <p className="mt-2 text-lg font-medium">{billTo.client}</p>
          <p className="text-sm text-muted-foreground">{billTo.project}</p>
          {billTo.address && (
            <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
              {billTo.address}
            </p>
          )}
        </div>
        <div className="sm:text-right">{summary}</div>
      </div>

      <div className="pt-6">
        {lineItems.length === 0 ? (
          emptyState
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">{label} line items</caption>
              <thead>
                <tr className="border-b border-border/70 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  <th scope="col" className="pb-3 pr-4 font-medium">
                    Description
                  </th>
                  <th scope="col" className="pb-3 pl-4 text-right font-medium">
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
                      <span className="block font-medium text-foreground">
                        {item.title}
                      </span>
                      <span className="mt-0.5 block text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
                        {BILLABLE_KIND_LABELS[item.kind]}
                      </span>
                    </td>
                    <td className="py-3 pl-4 text-right align-top font-medium tabular-nums">
                      {formatMoney(item.amountCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-6 flex items-end justify-between gap-4 border-t border-border/70 pt-5">
        <p className="max-w-[34ch] text-xs leading-relaxed text-muted-foreground">
          {footnote}
        </p>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            {totalLabel}
          </p>
          <p className="mt-1 font-serif text-3xl leading-none">
            {formatMoney(totalCents)}
          </p>
        </div>
      </div>
    </article>
  );
}
