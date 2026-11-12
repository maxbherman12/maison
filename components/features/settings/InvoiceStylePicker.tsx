'use client';

import { useOptimistic, useState, useTransition } from 'react';
import { Check } from 'lucide-react';
import { setInvoiceStyle } from '@/lib/actions/settings';
import {
  INVOICE_STYLE_DEFINITIONS,
  INVOICE_STYLES,
  type InvoiceStyle,
} from '@/lib/domain/invoice-styles';
import type { InvoiceIssuer } from '@/lib/domain/settings';
import { Alert } from '@/components/ui/alert';
import { InvoiceStylePreview } from '@/components/features/invoices/InvoiceStylePreview';

/**
 * Three cards that each show a miniature invoice. Choosing one saves at once,
 * separately from the settings form, and applies to invoices created after.
 */
export function InvoiceStylePicker({
  value,
  from,
}: {
  value: InvoiceStyle;
  from: InvoiceIssuer;
}) {
  const [selected, select] = useOptimistic(value);
  const [, startTransition] = useTransition();
  const [saved, setSaved] = useState<InvoiceStyle | null>(null);
  const [error, setError] = useState<string | null>(null);

  function choose(style: InvoiceStyle) {
    if (style === selected) return;
    setError(null);
    setSaved(null);
    startTransition(async () => {
      select(style);
      const result = await setInvoiceStyle(style);
      if (result.ok) setSaved(style);
      else setError(result.error);
    });
  }

  return (
    <fieldset>
      <legend className="flex w-full items-baseline justify-between text-label text-muted-foreground">
        Invoice style
        <span aria-live="polite" className="inline-flex items-center gap-1 text-foreground">
          {saved === selected && (
            <>
              <Check className="size-3.5" aria-hidden="true" />
              Saved
            </>
          )}
        </span>
      </legend>

      <div className="mt-3 grid grid-cols-3 gap-2 sm:gap-4">
        {INVOICE_STYLES.map((style) => {
          const definition = INVOICE_STYLE_DEFINITIONS[style];

          return (
            <label
              key={style}
              className="group cursor-pointer transition-transform duration-200 ease-gallery has-checked:-translate-y-1.5 has-focus-visible:outline-2 has-focus-visible:outline-offset-4 has-focus-visible:outline-foreground"
            >
              <input
                type="radio"
                name="invoiceStyle"
                value={style}
                checked={selected === style}
                aria-label={`${definition.label}: ${definition.description}`}
                onChange={() => choose(style)}
                className="sr-only"
              />
              <span className="block border border-border transition-shadow group-has-checked:border-foreground group-has-checked:shadow-[0_5px_0_-3px_var(--foreground)]">
                <InvoiceStylePreview style={style} from={from} />
              </span>
              <span className="mt-2 flex items-center gap-1.5 text-sm font-medium">
                {definition.label}
                {selected === style && (
                  <Check className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
                )}
              </span>
              <span className="hidden text-label text-muted-foreground sm:block">
                {definition.description}
              </span>
            </label>
          );
        })}
      </div>

      <p className="mt-2 text-label text-muted-foreground">
        Applies to invoices you create from now on.
      </p>
      {error && <Alert className="mt-3">{error}</Alert>}
    </fieldset>
  );
}
