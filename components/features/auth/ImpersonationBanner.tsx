'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';

export function ImpersonationBanner({ name }: { name: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-amber-300/60 bg-amber-50 px-4 py-2 text-sm text-amber-950 sm:px-6">
      <div className="min-w-0">
        <p className="truncate">
          <span className="font-medium">Viewing as {name}.</span>{' '}
          <span className="hidden sm:inline">
            Changes are saved to this account.
          </span>
        </p>
        {error ? (
          <p role="alert" className="mt-1 text-xs text-destructive">
            {error}
          </p>
        ) : null}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const { error: stopError } =
              await authClient.admin.stopImpersonating();

            if (stopError) {
              setError(
                stopError.message ?? 'Unable to return to the admin account.'
              );
              return;
            }

            queryClient.clear();
            router.push('/projects');
            router.refresh();
          })
        }
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        Return to admin
      </Button>
    </div>
  );
}
