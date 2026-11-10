/** What every Server Action returns. Expected failures are values, not throws. */
export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };
