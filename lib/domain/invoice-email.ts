import { formatDate } from './dates';
import { formatInvoiceNumber } from './invoices';
import { formatMoney } from './money';

export interface InvoiceEmailInput {
  number: number;
  clientName: string;
  projectName: string;
  totalCents: number;
  /** Set once the invoice is sent; a resend quotes it. */
  dueAt: Date | null;
  /** Used before the invoice is sent, when there is no due date yet. */
  paymentTermsDays: number;
  paymentNote: string;
  fromName: string;
  clientEmail: string;
}

export interface InvoiceEmail {
  to: string;
  subject: string;
  body: string;
}

function dueSentence(input: InvoiceEmailInput, now: Date): string {
  if (input.dueAt) {
    const date = formatDate(input.dueAt);
    return input.dueAt.getTime() < now.getTime()
      ? `Payment was due ${date}.`
      : `Payment is due ${date}.`;
  }
  // Not sent yet: quote the terms, so the email never names a date that
  // disagrees with the one marking it sent will set.
  const days = input.paymentTermsDays;
  if (days === 0) return 'Payment is due on receipt.';
  return `Payment is due within ${days} ${days === 1 ? 'day' : 'days'}.`;
}

/**
 * The draft handed to the designer's own mail app or share sheet. The app
 * never sends it; the designer reviews, attaches if needed, and sends.
 */
export function buildInvoiceEmail(
  input: InvoiceEmailInput,
  now: Date = new Date()
): InvoiceEmail {
  const number = formatInvoiceNumber(input.number);
  const firstName = input.clientName.trim().split(/\s+/)[0];
  const signOff = input.fromName.trim();

  const paragraphs = [
    firstName ? `Hi ${firstName},` : 'Hello,',
    `Please find attached invoice ${number} for ${input.projectName}, ` +
      `for ${formatMoney(input.totalCents)}. ${dueSentence(input, now)}`,
    input.paymentNote.trim(),
    signOff ? `Thank you,\n${signOff}` : 'Thank you',
  ].filter(Boolean);

  return {
    to: input.clientEmail.trim(),
    subject: `Invoice ${number} — ${input.projectName}`,
    body: paragraphs.join('\n\n'),
  };
}

/** A `mailto:` link for the draft. Mail clients expect CRLF line breaks. */
export function mailtoHref({ to, subject, body }: InvoiceEmail): string {
  const address = encodeURIComponent(to).replace(/%40/g, '@');
  const params = [
    `subject=${encodeURIComponent(subject)}`,
    `body=${encodeURIComponent(body.replace(/\r?\n/g, '\r\n'))}`,
  ];
  return `mailto:${address}?${params.join('&')}`;
}
