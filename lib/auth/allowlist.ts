/**
 * Email admission control.
 *
 * Google proves who someone is; these lists decide whether that identity may
 * use the app. Both variables are comma-separated and case-insensitive.
 * Missing or empty `ALLOWED_EMAILS` denies everyone — there is no open mode.
 */

function parse(value: string | undefined): Set<string> {
  return new Set(
    (value ?? '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function allowedEmails(): Set<string> {
  return parse(process.env.ALLOWED_EMAILS);
}

export function adminEmails(): Set<string> {
  return parse(process.env.ADMIN_EMAILS);
}

export function isAllowedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return allowedEmails().has(email.trim().toLowerCase());
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return adminEmails().has(normalized) && allowedEmails().has(normalized);
}

/**
 * Fails fast on a configuration that would silently grant admin to someone who
 * cannot sign in. Called once when the auth instance is created.
 */
export function assertAuthConfig(): void {
  const allowed = allowedEmails();
  for (const email of adminEmails()) {
    if (!allowed.has(email)) {
      throw new Error(
        `ADMIN_EMAILS contains "${email}", which is not in ALLOWED_EMAILS.`
      );
    }
  }
}
