'use client';

import { useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { authClient } from '@/lib/auth/client';

interface SignInPanelProps {
  error?: string;
  redirectTo: string;
}

export function SignInPanel({ error, redirectTo }: SignInPanelProps) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(
    error
      ? 'We couldn’t sign you in. If your Google account is not on the allowlist, ask the owner to add it.'
      : null
  );

  async function handleSignIn() {
    setPending(true);
    setMessage(null);

    const result = await authClient.signIn.social({
      provider: 'google',
      callbackURL: redirectTo,
      errorCallbackURL: `/sign-in?next=${encodeURIComponent(redirectTo)}`,
    });

    if (result.error) {
      setMessage(result.error.message ?? 'Unable to sign in. Please try again.');
      setPending(false);
    }
  }

  return (
    <main className="flex min-h-0 flex-1 items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-sm">
        <p className="font-serif text-3xl tracking-tight">Maison</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Interior design project management. Sign in to continue.
        </p>

        {message && <Alert className="mt-6">{message}</Alert>}

        <Button
          type="button"
          className="mt-8 w-full"
          disabled={pending}
          onClick={handleSignIn}
        >
          {pending ? 'Redirecting…' : 'Continue with Google'}
        </Button>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Access is limited to invited accounts.
        </p>
      </div>
    </main>
  );
}
