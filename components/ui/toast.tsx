'use client';

import { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Notice {
  tone: 'success' | 'error';
  text: string;
}

/** Show a transient notice and clear it after `timeout` ms. */
export function useNotice(timeout = 2800) {
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), timeout);
    return () => window.clearTimeout(timer);
  }, [notice, timeout]);

  return [notice, setNotice] as const;
}

export function Toast({ notice }: { notice: Notice | null }) {
  if (!notice) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'pointer-events-none fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full px-4 py-2.5 text-sm text-background shadow-lg',
        notice.tone === 'error' ? 'bg-destructive text-white' : 'bg-foreground'
      )}
    >
      {notice.tone === 'success' ? (
        <Check className="size-4" />
      ) : (
        <X className="size-4" />
      )}
      {notice.text}
    </div>
  );
}
