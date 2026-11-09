'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authClient } from '@/lib/auth-client';
import { SessionUserIdContext } from '@/lib/query/session';

/**
 * Bridges the verified server session into the client query layer.
 *
 * `authClient.useSession()` is the client-side observable for the signed-in
 * user. The server-provided id is used while that atom is still loading and as
 * a signal that the session changed on the server (for example after an
 * impersonation redirect).
 */
export function SessionProvider({
  userId: initialUserId,
  children,
}: {
  userId: string;
  children: ReactNode;
}) {
  const queryClient = useQueryClient();
  const { data, isPending } = authClient.useSession();
  const userId = isPending ? initialUserId : (data?.user.id ?? null);
  const previousUserId = useRef(userId);
  const previousInitialUserId = useRef(initialUserId);

  useEffect(() => {
    if (previousUserId.current === userId) return;

    previousUserId.current = userId;
    queryClient.clear();
  }, [queryClient, userId]);

  // A server render changed identity (for example after an impersonation
  // server action). Clear immediately and ask Better Auth's atom to refetch.
  useEffect(() => {
    if (previousInitialUserId.current === initialUserId) return;

    previousInitialUserId.current = initialUserId;
    queryClient.clear();
    authClient.$store.notify('$sessionSignal');
  }, [initialUserId, queryClient]);

  return (
    <SessionUserIdContext.Provider value={userId}>
      {children}
    </SessionUserIdContext.Provider>
  );
}
