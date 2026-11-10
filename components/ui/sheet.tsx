'use client';

import type { ReactNode } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

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
 * The shared modal: a bottom sheet on phones, a centred dialog on larger
 * screens. Mount it to open it. Base UI owns the focus trap, focus return,
 * Escape handling, and scroll lock.
 */
export function Sheet({
  eyebrow,
  title,
  description,
  onClose,
  children,
  size = 'default',
}: SheetProps) {
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-foreground/36" />
        <Dialog.Viewport className="fixed inset-0 z-40 flex items-end justify-center sm:items-center sm:p-4">
          <Dialog.Popup
            className={cn(
              'max-h-sheet w-full overflow-y-auto overscroll-contain bg-card p-6 pb-[calc(1.5rem_+_env(safe-area-inset-bottom))] outline-none motion-safe:animate-in motion-safe:slide-in-from-bottom-8',
              size === 'wide' ? 'max-w-lg' : 'max-w-md'
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                {eyebrow && (
                  <span className="text-label text-muted-foreground">
                    {eyebrow}
                  </span>
                )}
                <Dialog.Title className="mt-1 font-serif text-name font-normal">
                  {title}
                </Dialog.Title>
                {description && (
                  <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                    {description}
                  </Dialog.Description>
                )}
              </div>
              <Dialog.Close
                aria-label="Close"
                className="flex size-11 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="size-4" />
              </Dialog.Close>
            </div>

            <div className="mt-6">{children}</div>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
