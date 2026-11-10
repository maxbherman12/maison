'use client';

import { useState, useTransition } from 'react';
import type { ActionResult } from './result';

/**
 * Runs a Server Action from a client component and tracks its state. Thrown
 * errors, such as a lost connection, are left to the route's error boundary,
 * which is also how an expired session's redirect reaches the router.
 */
export function useAction() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run<T>(
    action: () => Promise<ActionResult<T>>,
    onSuccess?: (data: T) => void
  ) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.ok) onSuccess?.(result.data);
      else setError(result.error);
    });
  }

  return { run, pending, error };
}
