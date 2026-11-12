import { z } from 'zod';
import { INVOICE_STYLES } from '@/lib/domain/invoice-styles';
import { MAX_PAYMENT_TERMS_DAYS } from '@/lib/domain/settings';
import { optionalPositiveMoneyField, optionalText, requiredText } from './fields';

const MAX_TEXT = 200;
const MAX_NOTE = 500;

const shortText = optionalText.pipe(
  z.string().max(MAX_TEXT, `Keep this under ${MAX_TEXT} characters`)
);

const PaymentTermsField = z
  .string()
  .trim()
  .refine((value) => {
    if (!/^\d+$/.test(value)) return false;
    return Number(value) <= MAX_PAYMENT_TERMS_DAYS;
  }, `Enter a whole number of days from 0 to ${MAX_PAYMENT_TERMS_DAYS}`)
  .transform(Number);

/** The settings form. The invoice style saves on its own, outside the form. */
export const SettingsSchema = z
  .object({
    name: requiredText('Your name is required').max(MAX_TEXT),
    companyName: shortText,
    businessAddress: optionalText.pipe(
      z.string().max(MAX_NOTE, `Keep the address under ${MAX_NOTE} characters`)
    ),
    businessEmail: z
      .string()
      .trim()
      .refine(
        (value) => value === '' || z.email().safeParse(value).success,
        'Enter a valid email'
      ),
    businessPhone: shortText,
    defaultHourlyRate: optionalPositiveMoneyField(
      'Default rate must be greater than zero'
    ),
    paymentTermsDays: PaymentTermsField,
    paymentNote: optionalText.pipe(
      z.string().max(MAX_NOTE, `Keep the note under ${MAX_NOTE} characters`)
    ),
  })
  .transform(({ name, defaultHourlyRate, ...settings }) => ({
    name,
    settings: { ...settings, defaultHourlyRateCents: defaultHourlyRate },
  }));

export type SettingsFormValues = z.input<typeof SettingsSchema>;
export type SettingsInput = z.output<typeof SettingsSchema>;

export const InvoiceStyleSchema = z.enum(INVOICE_STYLES);
