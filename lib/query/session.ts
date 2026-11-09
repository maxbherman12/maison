'use client';

import { createContext, useContext } from 'react';

/**
 * The authenticated user id for the current server render. Query keys are
 * scoped with this value so a session change cannot reuse another account's
 * cached data.
 */
export const SessionUserIdContext = createContext<string | null>(null);

export function useSessionUserId(): string | null {
  return useContext(SessionUserIdContext);
}

export function userScopedKey(
  userId: string | null,
  key: readonly unknown[]
): readonly unknown[] {
  return ['session-user', userId ?? 'anonymous', ...key];
}
