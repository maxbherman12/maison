import { redirect } from 'next/navigation';
import { SignInPanel } from '@/components/features/auth/SignInPanel';
import { getSession } from '@/lib/auth/session';

function safeRedirect(value: string | undefined): string {
  if (!value) return '/projects';
  if (!value.startsWith('/') || value.startsWith('//')) return '/projects';
  return value;
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  // `getSession` re-checks the allowlist and ban state, so a stale cookie for
  // an account that has since been removed renders the sign-in panel instead
  // of bouncing between `/sign-in` and `/projects`.
  const session = await getSession();
  const { error, next } = await searchParams;
  const redirectTo = safeRedirect(next);

  if (session) {
    redirect(redirectTo);
  }

  return <SignInPanel error={error} redirectTo={redirectTo} />;
}
