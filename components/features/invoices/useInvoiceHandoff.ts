'use client';

import { useEffect, useState } from 'react';
import { mailtoHref, type InvoiceEmail } from '@/lib/domain/invoice-email';

/** What happened when the draft was handed to the designer's own apps. */
export type HandoffResult = 'shared' | 'drafted' | 'cancelled';

/** Phones share the PDF itself; desktops get a mailto draft plus a download. */
function prefersShareSheet(): boolean {
  return (
    typeof navigator.canShare === 'function' &&
    window.matchMedia('(pointer: coarse)').matches
  );
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

function download(href: string, filename: string) {
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  link.click();
}

/**
 * Hands an invoice to the designer's own mail app. The app never sends mail.
 *
 * On phones the PDF is fetched ahead of time, because iOS Safari forgets the
 * tap if `navigator.share` waits on a fetch, and then refuses to share.
 */
export function useInvoiceHandoff({
  pdfHref,
  filename,
}: {
  pdfHref: string;
  filename: string;
}) {
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (!prefersShareSheet()) return;

    const controller = new AbortController();
    fetch(pdfHref, { signal: controller.signal })
      .then((response) => (response.ok ? response.blob() : null))
      .then((blob) => {
        if (!blob) return;
        const pdf = new File([blob], filename, { type: 'application/pdf' });
        if (navigator.canShare({ files: [pdf] })) setFile(pdf);
      })
      // Without a file the hand-off falls back to mailto.
      .catch(() => {});

    return () => controller.abort();
  }, [pdfHref, filename]);

  async function handOff(draft: InvoiceEmail): Promise<HandoffResult> {
    if (file) {
      try {
        await navigator.share({
          files: [file],
          title: draft.subject,
          text: draft.body,
        });
        return 'shared';
      } catch (error) {
        if (isAbort(error)) return 'cancelled';
        // Any other refusal falls through to the mailto draft.
      }
    }

    download(pdfHref, filename);
    window.location.href = mailtoHref(draft);
    return 'drafted';
  }

  return handOff;
}
