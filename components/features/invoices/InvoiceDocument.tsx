import type { ReactNode } from 'react';
import {
  invoiceStyleTokens,
  type InvoiceStyle,
} from '@/lib/domain/invoice-styles';
import { formatMoney } from '@/lib/domain/money';
import type { InvoiceIssuer } from '@/lib/domain/settings';
import { cn } from '@/lib/utils';

/**
 * The on-screen invoice, shared by the draft, generated invoices, and the
 * style previews in settings. It reads the same style tokens as the PDF.
 */
export function InvoiceDocument({
  label,
  style,
  from,
  billTo,
  side,
  totalCents,
  paymentNote = '',
  children,
}: {
  /** Beside the letterhead: the invoice number or "Draft". */
  label: string;
  style: InvoiceStyle;
  from: InvoiceIssuer;
  billTo: { client: string; project: string; address: string };
  /** Right-hand block next to the bill-to details. */
  side: ReactNode;
  totalCents: number;
  paymentNote?: string;
  /** The line items. */
  children: ReactNode;
}) {
  const tokens = invoiceStyleTokens(style);
  const centered = tokens.letterheadAlign === 'center';
  const details = from.details.split('\n').filter(Boolean);
  const band = tokens.headings === 'band';

  return (
    <article aria-label={label} className="flex flex-col gap-2.5 pt-2">
      {tokens.accent === 'paint-bar' && <div className="h-1.5 bg-primary" />}

      <header
        className={cn(
          'flex gap-x-3',
          centered
            ? 'flex-col items-center gap-y-1 pb-3 text-center'
            : 'items-baseline justify-between'
        )}
      >
        <div className="min-w-0">
          {/* The business name wraps, never truncates, matching the PDF. */}
          <p
            className={cn(
              'text-balance break-words',
              tokens.letterheadFont === 'serif'
                ? 'font-serif'
                : 'font-sans font-semibold tracking-tight',
              centered ? 'text-name' : 'text-2xl'
            )}
          >
            {from.name}
          </p>
          {details.length > 0 && (
            <p className="text-label text-muted-foreground">
              {centered
                ? details.join(' · ')
                : details.map((line) => (
                    <span key={line} className="block truncate">
                      {line}
                    </span>
                  ))}
            </p>
          )}
        </div>
        <p
          className={cn(
            'shrink-0 text-label text-muted-foreground',
            centered && 'uppercase tracking-widest'
          )}
        >
          {label}
        </p>
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

      <div>
        {band && (
          <div className="flex justify-between bg-foreground px-2 py-1 text-label text-background">
            <span>Description</span>
            <span>Amount</span>
          </div>
        )}
        <div
          className={cn(
            band && 'px-2',
            tokens.rows === 'ruled' && '[&>*]:border-b [&>*]:border-border'
          )}
        >
          {children}
        </div>
      </div>

      {tokens.total === 'box' ? (
        <div className="ml-auto flex w-full max-w-64 items-baseline justify-between border border-foreground px-3 py-2">
          <span className="text-label text-muted-foreground">Total due</span>
          <span className="font-serif text-name tabular-nums">
            {formatMoney(totalCents)}
          </span>
        </div>
      ) : (
        <div className="flex items-baseline justify-between border-t border-foreground pt-3">
          <span>Total</span>
          <span className="font-serif text-name tabular-nums">
            {formatMoney(totalCents)}
          </span>
        </div>
      )}

      {paymentNote && (
        <div className="pt-2 text-label text-muted-foreground">
          Payment
          <p className="whitespace-pre-line text-base text-foreground">
            {paymentNote}
          </p>
        </div>
      )}
    </article>
  );
}
