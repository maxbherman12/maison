'use client';

import { useEffect, useState } from 'react';
import { mailtoHref, type InvoiceEmail } from '@/lib/domain/invoice-email';

/** What happened when the draft was handed to the designer's own apps. */
export type HandoffResult = 'shared' | 'drafted' | 'cancelled';

/**
 * The share sheet attaches the PDF but cannot set a recipient; a mailto draft
 * sets the recipient but cannot attach. Attaching matters more, so the share
 * sheet wins wherever the browser can share files (phones, and Chrome or
 * Safari on desktop), and the recipient is copied to the clipboard instead.
 */
function canShareFiles(): boolean {
  return typeof navigator.canShare === 'function';
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
 * Where files can be shared, the PDF is fetched ahead of time, because Safari
 * forgets the click if `navigator.share` waits on a fetch, and then refuses.
 */
export function useInvoiceHandoff({
  pdfHref,
  filename,
  onRecipientCopied,
}: {
  pdfHref: string;
  filename: string;
  /** Called once the recipient is on the clipboard, ready to paste into To:. */
  onRecipientCopied?: (email: string) => void;
}) {
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (!canShareFiles()) return;

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
      if (draft.to) {
        // Not awaited: `share` must run while the click still counts.
        navigator.clipboard
          ?.writeText(draft.to)
          .then(() => onRecipientCopied?.(draft.to))
          .catch(() => {});
      }
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
