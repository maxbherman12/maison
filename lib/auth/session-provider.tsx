'use client';

import { createContext, useContext, type ReactNode } from 'react';

/**
 * The parts of the verified server session that client components need.
 * Deliberately excludes session tokens and anything sensitive.
 */
export interface ClientSession {
  name: string;
  email: string;
  isAdmin: boolean;
  isImpersonating: boolean;
}

const SessionContext = createContext<ClientSession | null>(null);

export function SessionProvider({
  session,
  children,
}: {
  session: ClientSession;
  children: ReactNode;
}) {
  return <SessionContext value={session}>{children}</SessionContext>;
}

export function useClientSession(): ClientSession {
  const session = useContext(SessionContext);
  if (!session) throw new Error('useClientSession requires a SessionProvider');
  return session;
}
