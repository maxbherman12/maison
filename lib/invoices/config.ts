const DEFAULT_INVOICE_DUE_DAYS = 14;

/**
 * Net payment terms, in days, applied when an invoice is marked sent. Read at
 * call time so the value can change without a rebuild.
 */
export function getInvoiceDueDays(): number {
  const raw = process.env.INVOICE_DUE_DAYS;
  if (!raw) return DEFAULT_INVOICE_DUE_DAYS;

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0
    ? parsed
    : DEFAULT_INVOICE_DUE_DAYS;
}
