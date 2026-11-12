'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import type { InvoiceStyle } from '@/lib/domain/invoice-styles';
import { paintStyle } from '@/lib/domain/paints';
import type { InvoiceIssuer } from '@/lib/domain/settings';
import { InvoiceDocument } from './InvoiceDocument';

/** The width the miniature is laid out at before it is scaled to fit. */
const PAGE_WIDTH = 360;

const SAMPLE_LINES = [
  { title: 'Design consultation', detail: 'Logged time', amount: '$1,250.00' },
  { title: 'Linen sofa', detail: 'Furniture', amount: '$3,480.00' },
  { title: 'Site visits', detail: 'Logged time', amount: '$450.00' },
];

/**
 * A real `InvoiceDocument` with sample lines, scaled down to its container, so
 * the preview can never drift from what invoices actually look like.
 */
export function InvoiceStylePreview({
  style,
  from,
}: {
  style: InvoiceStyle;
  from: InvoiceIssuer;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.3);

  useLayoutEffect(() => {
    const node = frame.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setScale(entry.contentRect.width / PAGE_WIDTH);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={frame}
      aria-hidden="true"
      inert
      className="pointer-events-none relative aspect-[3/4] overflow-hidden bg-background select-none"
    >
      <div
        className="absolute top-0 left-0 origin-top-left px-5 pb-5"
        style={{ width: PAGE_WIDTH, transform: `scale(${scale})`, ...paintStyle('verdigris') }}
      >
        <InvoiceDocument
          label="Invoice #1042"
          style={style}
          from={from}
          billTo={{ client: 'Eleanor Vance', project: 'Hill House', address: '' }}
          side={
            <>
              Issued
              <b className="block text-base font-medium text-foreground">Nov 11, 2026</b>
            </>
          }
          totalCents={518_000}
        >
          {SAMPLE_LINES.map((line) => (
            <div key={line.title} className="flex items-center gap-3 py-1.5">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{line.title}</span>
                <span className="block text-label text-muted-foreground">{line.detail}</span>
              </span>
              <span className="shrink-0 tabular-nums">{line.amount}</span>
            </div>
          ))}
        </InvoiceDocument>
      </div>
    </div>
  );
}
