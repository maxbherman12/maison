import type { Invoice, InvoiceStatus } from '@/lib/types';

/**
 * Derives the lifecycle status from timestamps. `paid` wins over everything so
 * legacy rows that were paid before `paidAt` existed still read as paid.
 */
export function getInvoiceStatus(
  invoice: Invoice,
  now: Date = new Date()
): InvoiceStatus {
  if (invoice.paid || invoice.paidAt) return 'Paid';
  if (!invoice.sentAt) return 'Issued';

  if (invoice.dueAt && Date.parse(invoice.dueAt) < now.getTime()) {
    return 'Overdue';
  }

  return 'Sent';
}

/** True when money is still owed on the invoice. */
export function isOutstanding(invoice: Invoice): boolean {
  return getInvoiceStatus(invoice) !== 'Paid';
}
