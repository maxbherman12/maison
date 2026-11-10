/**
 * Email admission control.
 *
 * Google proves who someone is; `ALLOWED_EMAILS` decides whether that identity
 * may use the app. It is comma-separated and case-insensitive. Missing or empty
 * denies everyone — there is no open mode.
 *
 * Admin access is not configured here: `user.role` is the single source of
 * truth, enforced by Better Auth's admin plugin.
 */

function parse(value: string | undefined): Set<string> {
  return new Set(
    (value ?? '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function isAllowedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return parse(process.env.ALLOWED_EMAILS).has(email.trim().toLowerCase());
}
