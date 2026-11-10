'use client';

import { useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <AppShell>
      <div className="mx-auto max-w-md py-16 text-center">
        <h1 className="font-serif text-heading font-normal">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your work is safe. Try again, and if this keeps happening, reload the
          page.
        </p>
        <Button type="button" className="mt-6" onClick={reset}>
          Try again
        </Button>
      </div>
    </AppShell>
  );
}
