'use client';

import { useTransition } from 'react';
import { ArrowLeft } from 'lucide-react';
import { stopImpersonating } from '@/app/(app)/actions';
import { Button } from '@/components/ui/button';

export function ImpersonationBanner({ name }: { name: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-amber-300/60 bg-amber-50 px-4 py-2 text-sm text-amber-950 sm:px-6">
      <p className="min-w-0 truncate">
        <span className="font-medium">Viewing as {name}.</span>{' '}
        <span className="hidden sm:inline">
          Changes are saved to this account.
        </span>
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await stopImpersonating();
          })
        }
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        Return to admin
      </Button>
    </div>
  );
}
