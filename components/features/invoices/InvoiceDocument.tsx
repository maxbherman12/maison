import type { ReactNode } from 'react';
import { formatMoney } from '@/lib/domain/money';

/** The on-screen invoice, shared by the draft and generated invoices. */
export function InvoiceDocument({
  label,
  billTo,
  side,
  totalCents,
  children,
}: {
  /** Top-right of the letterhead: the invoice number or "Draft". */
  label: string;
  billTo: { client: string; project: string; address: string };
  /** Right-hand block next to the bill-to details. */
  side: ReactNode;
  totalCents: number;
  /** The line items. */
  children: ReactNode;
}) {
  return (
    <article aria-label={label} className="flex flex-col gap-2.5 pt-2">
      <div className="h-1.5 bg-primary" />
      <header className="flex items-baseline justify-between gap-3">
        <p className="font-serif text-2xl">Maison</p>
        <p className="text-label text-muted-foreground">{label}</p>
      </header>
      <div className="flex justify-between gap-4 text-label text-muted-foreground">
        <div className="min-w-0">
          Billed to
          <b className="block truncate text-base font-medium text-foreground">
            {billTo.client}
          </b>
          <span className="block truncate">{billTo.project}</span>
          {billTo.address && (
            <span className="block truncate">{billTo.address}</span>
          )}
        </div>
        <div className="shrink-0 text-right">{side}</div>
      </div>
      <div>{children}</div>
      <div className="flex items-baseline justify-between border-t border-foreground pt-3">
        <span>Total</span>
        <span className="font-serif text-name tabular-nums">
          {formatMoney(totalCents)}
        </span>
      </div>
    </article>
  );
}
