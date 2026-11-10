import type { Invoice } from './types';

export type InvoiceStatus = 'Issued' | 'Sent' | 'Paid' | 'Overdue';

/** Lifecycle status, derived from timestamps so it can never disagree with them. */
export function getInvoiceStatus(
  invoice: Pick<Invoice, 'sentAt' | 'dueAt' | 'paidAt'>,
  now: Date = new Date()
): InvoiceStatus {
  if (invoice.paidAt) return 'Paid';
  if (!invoice.sentAt) return 'Issued';
  if (invoice.dueAt && invoice.dueAt.getTime() < now.getTime()) return 'Overdue';
  return 'Sent';
}

export function formatInvoiceNumber(number: number): string {
  return `#${number}`;
}
