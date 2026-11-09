/**
 * Development-only auth switch.
 *
 * Setting `IMPERSONATE_USER=<user id>` makes the server resolve every request
 * as that account. It is intentionally ignored in production so a stray
 * environment variable can never bypass authentication.
 *
 * This module must stay free of database and Node-only imports: `proxy.ts`
 * imports it in the edge runtime.
 */

let warnedAboutProduction = false;

export function devImpersonationUserId(): string | null {
  const userId = process.env.IMPERSONATE_USER?.trim();
  if (!userId) return null;

  if (process.env.NODE_ENV === 'production') {
    if (!warnedAboutProduction) {
      warnedAboutProduction = true;
      console.warn(
        '[auth] IMPERSONATE_USER is a development-only setting and is ignored in production.'
      );
    }
    return null;
  }

  return userId;
}
