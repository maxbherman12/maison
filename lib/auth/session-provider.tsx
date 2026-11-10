'use client';

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authClient } from '@/lib/auth-client';
import { SessionUserIdContext } from '@/lib/query/session';

/**
 * The parts of the verified server session that client components need.
 * Deliberately excludes session tokens and anything sensitive.
 */
export interface ServerSession {
  user: {
    id: string;
    name: string;
    email: string;
    /** Better Auth admin plugin column; `admin` is the only elevated value. */
    role: string | null;
  };
  session: {
    impersonatedBy: string | null;
  };
}

const ServerSessionContext = createContext<ServerSession | null>(null);

/**
 * The session the server verified for this render. Useful before Better
 * Auth's client atom loads — and in the `IMPERSONATE_USER` dev override,
 * where no client-side session exists at all.
 */
export function useServerSession(): ServerSession | null {
  return useContext(ServerSessionContext);
}

/**
 * Bridges the verified server session into the client query layer.
 *
 * `authClient.useSession()` is the client-side observable for the signed-in
 * user. The server-provided id is used while that atom is still loading and as
 * a signal that the session changed on the server (for example after an
 * impersonation redirect).
 */
export function SessionProvider({
  session: initialSession,
  children,
}: {
  session: ServerSession;
  children: ReactNode;
}) {
  const queryClient = useQueryClient();
  const { data, isPending } = authClient.useSession();
  const userId = isPending ? initialSession.user.id : (data?.user.id ?? null);
  const previousUserId = useRef(userId);
  const previousInitialUserId = useRef(initialSession.user.id);

  useEffect(() => {
    if (previousUserId.current === userId) return;

    previousUserId.current = userId;
    queryClient.clear();
  }, [queryClient, userId]);

  // A server render changed identity (for example after an impersonation
  // server action). Clear immediately and ask Better Auth's atom to refetch.
  useEffect(() => {
    if (previousInitialUserId.current === initialSession.user.id) return;

    previousInitialUserId.current = initialSession.user.id;
    queryClient.clear();
    authClient.$store.notify('$sessionSignal');
  }, [initialSession.user.id, queryClient]);

  return (
    <ServerSessionContext.Provider value={initialSession}>
      <SessionUserIdContext.Provider value={userId}>
        {children}
      </SessionUserIdContext.Provider>
    </ServerSessionContext.Provider>
  );
}
