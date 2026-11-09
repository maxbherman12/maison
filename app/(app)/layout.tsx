import type { ReactNode } from 'react';
import { ImpersonationBanner } from '@/components/features/auth/ImpersonationBanner';
import { SessionProvider } from '@/lib/auth/session-provider';
import { requireSession } from '@/lib/auth/session';

/**
 * Authenticated app shell. The proxy redirects cookie-less visitors, but this
 * is the check that actually verifies the session and the allowlist.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await requireSession();

  return (
    <SessionProvider userId={session.user.id}>
      <div className="flex min-h-0 flex-1 flex-col">
        {session.session.impersonatedBy ? (
          <ImpersonationBanner name={session.user.name} />
        ) : null}
        {children}
      </div>
    </SessionProvider>
  );
}
