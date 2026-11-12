import { DEFAULT_INVOICE_STYLE } from './invoice-styles';
import type { AccountSettings } from './types';

/** What an account uses until it saves settings of its own. */
export const DEFAULT_SETTINGS: AccountSettings = {
  companyName: '',
  businessAddress: '',
  businessEmail: '',
  businessPhone: '',
  defaultHourlyRateCents: null,
  invoiceStyle: DEFAULT_INVOICE_STYLE,
  paymentTermsDays: 14,
  paymentNote: '',
};

export const MAX_PAYMENT_TERMS_DAYS = 365;

/** The sender as printed on an invoice. */
export interface InvoiceIssuer {
  name: string;
  /** Address, email, and phone, one per line. */
  details: string;
}

/**
 * Who an invoice is from. The company name wins; without one, the designer's
 * own name keeps the letterhead from being blank.
 */
export function invoiceIssuer(
  settings: Pick<
    AccountSettings,
    'companyName' | 'businessAddress' | 'businessEmail' | 'businessPhone'
  >,
  fallbackName: string
): InvoiceIssuer {
  return {
    name: settings.companyName || fallbackName,
    details: [settings.businessAddress, settings.businessEmail, settings.businessPhone]
      .flatMap((part) => part.split('\n'))
      .map((line) => line.trim())
      .filter(Boolean)
      .join('\n'),
  };
}
