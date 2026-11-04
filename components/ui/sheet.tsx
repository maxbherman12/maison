'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface SheetProps {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  /** Wider panel for edit forms. */
  size?: 'default' | 'wide';
}

/**
 * The shared modal used by the furniture and billable-item sheets. It owns the
 * backdrop, focus, Escape handling, and safe-area padding so every sheet looks
 * and behaves the same.
 */
export function Sheet({
  eyebrow,
  title,
  description,
  onClose,
  children,
  size = 'default',
}: SheetProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-foreground/30 sm:items-center sm:p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`max-h-sheet w-full overflow-y-auto overscroll-contain rounded-t-3xl bg-card p-6 pb-[calc(1.5rem_+_env(safe-area-inset-bottom))] sm:rounded-3xl ${
          size === 'wide' ? 'max-w-lg' : 'max-w-md'
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {eyebrow && (
              <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {eyebrow}
              </span>
            )}
            <h2
              id={titleId}
              className="mt-1 font-serif text-3xl leading-tight"
            >
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-sm text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
