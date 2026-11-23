'use client';

import { useEffect, useRef, useState } from 'react';
import { mailtoHref, type InvoiceEmail } from '@/lib/domain/invoice-email';

/** What happened when the draft was handed to the designer's own apps. */
export type HandoffResult = 'shared' | 'drafted' | 'cancelled';

/**
 * How the draft will be handed off. `checking` lasts until the PDF is ready
 * to share (or sharing turns out to be unavailable), so a fast tap can't land
 * on a different path from a later one.
 */
export type HandoffMode = 'checking' | 'share' | 'mailto';

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
  enabled = true,
  onCopyFailed,
}: {
  pdfHref: string;
  filename: string;
  /** False skips the PDF prefetch, e.g. when the Email button is hidden. */
  enabled?: boolean;
  /** Called if the recipient could not be put on the clipboard. */
  onCopyFailed?: (email: string) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<HandoffMode>('checking');
  const [busy, setBusy] = useState(false);
  // A ref as well as state: two taps in one frame both see `busy === false`.
  const busyRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    if (!canShareFiles()) {
      setMode('mailto');
      return;
    }

    const controller = new AbortController();
    fetch(pdfHref, { signal: controller.signal })
      .then((response) => (response.ok ? response.blob() : null))
      .then((blob) => {
        const pdf = blob && new File([blob], filename, { type: 'application/pdf' });
        if (pdf && navigator.canShare({ files: [pdf] })) {
          setFile(pdf);
          setMode('share');
        } else {
          setMode('mailto');
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setMode('mailto');
      });

    return () => controller.abort();
  }, [enabled, pdfHref, filename]);

  async function share(pdf: File, draft: InvoiceEmail): Promise<HandoffResult | null> {
    if (draft.to) {
      // Not awaited: `share` must run while the click still counts.
      const copied = navigator.clipboard?.writeText(draft.to);
      if (copied) copied.catch(() => onCopyFailed?.(draft.to));
      else onCopyFailed?.(draft.to);
    }
    try {
      await navigator.share({ files: [pdf], title: draft.subject, text: draft.body });
      return 'shared';
    } catch (error) {
      if (isAbort(error)) return 'cancelled';
      return null; // Any other refusal falls back to the mailto draft.
    }
  }

  async function handOff(draft: InvoiceEmail): Promise<HandoffResult> {
    if (busyRef.current) return 'cancelled';
    busyRef.current = true;
    setBusy(true);
    try {
      const shared = file && (await share(file, draft));
      if (shared) return shared;

      download(pdfHref, filename);
      window.location.href = mailtoHref(draft);
      return 'drafted';
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  return { handOff, mode, ready: mode !== 'checking' && !busy };
}
