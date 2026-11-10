import type { ReactNode } from 'react';
import { ImpersonationBanner } from '@/components/features/auth/ImpersonationBanner';
import { requireSession } from '@/lib/auth/session';
import { SessionProvider } from '@/lib/auth/session-provider';

/**
 * Authenticated app frame. The proxy redirects cookie-less visitors, but this
 * is the check that actually verifies the session and the allowlist.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const { user, session } = await requireSession();
  const isImpersonating = Boolean(session.impersonatedBy);

  return (
    <SessionProvider
      session={{
        name: user.name,
        email: user.email,
        isAdmin: user.role === 'admin' && !isImpersonating,
        isImpersonating,
      }}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        {isImpersonating && <ImpersonationBanner name={user.name} />}
        {children}
      </div>
    </SessionProvider>
  );
}
