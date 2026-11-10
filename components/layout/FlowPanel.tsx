'use client';

import { useRef, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Dialog } from '@base-ui/react/dialog';
import { ChevronLeft } from 'lucide-react';
import { paintStyle, type Paint } from '@/lib/domain/paints';
import { cn } from '@/lib/utils';

/**
 * A task on its own route: full screen on phones, a drawer on desktop. The
 * page behind stays mounted, so closing returns to it exactly as it was.
 */
export function FlowPanel({
  title,
  closeHref,
  paint,
  children,
}: {
  title: string;
  closeHref: string;
  paint?: Paint;
  children: ReactNode;
}) {
  const router = useRouter();
  // Focusing the panel itself keeps the phone keyboard closed on open.
  const panel = useRef<HTMLDivElement>(null);

  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) router.push(closeHref);
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-30 bg-foreground/30 motion-safe:animate-in motion-safe:fade-in max-md:hidden" />
        <Dialog.Popup
          ref={panel}
          initialFocus={panel}
          style={paint ? paintStyle(paint) : undefined}
          className="fixed inset-0 z-30 flex flex-col bg-background pt-[env(safe-area-inset-top)] outline-none md:left-auto md:w-[460px] md:motion-safe:animate-drawer"
        >
          <Dialog.Title className="sr-only">{title}</Dialog.Title>
          {children}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** The part of a flow screen that scrolls if its content is long. */
export function FlowBody({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-6 pt-3.5 pb-3 md:pt-6',
        className
      )}
    >
      {children}
    </div>
  );
}

/** The buttons along the bottom of a flow screen. */
export function FlowFooter({ children }: { children: ReactNode }) {
  return (
    <footer className="flex shrink-0 gap-2.5 px-5 pt-2.5 pb-[max(1.125rem,env(safe-area-inset-bottom))]">
      {children}
    </footer>
  );
}

const BACK_CLASS = 'inline-flex min-h-11 items-center gap-1.5 text-label';

/** Back as a link, or as a button when `onClick` is given. */
export function FlowBack({
  href,
  onClick,
  label = 'Back',
}: {
  href?: string;
  onClick?: () => void;
  label?: string;
}) {
  const content = (
    <>
      <ChevronLeft className="size-4" aria-hidden="true" />
      {label}
    </>
  );

  return href ? (
    <Link href={href} className={BACK_CLASS}>
      {content}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={BACK_CLASS}>
      {content}
    </button>
  );
}
