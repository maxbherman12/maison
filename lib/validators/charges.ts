import { z } from 'zod';
import { DateField, HoursField, moneyField, requiredText } from './fields';

const title = requiredText('Title is required');

/** Logging time: the amount comes from the project's hourly rate. */
export const LogHoursSchema = z.object({
  title,
  date: DateField,
  hours: HoursField,
});

/** A one-off charge with no hours. */
export const FlatChargeSchema = z
  .object({
    title,
    date: DateField,
    amount: moneyField('Amount must be greater than zero', 'positive'),
  })
  .transform(({ amount, ...charge }) => ({ ...charge, amountCents: amount }));

/** Editing logged time: the amount can be overridden independently of hours. */
export const EditHoursSchema = z
  .object({
    title,
    date: DateField,
    hours: HoursField,
    amount: moneyField('Enter a valid amount'),
  })
  .transform(({ amount, ...charge }) => ({ ...charge, amountCents: amount }));

export type LogHoursFormValues = z.input<typeof LogHoursSchema>;
export type LogHoursInput = z.output<typeof LogHoursSchema>;
export type FlatChargeFormValues = z.input<typeof FlatChargeSchema>;
export type FlatChargeInput = z.output<typeof FlatChargeSchema>;
export type EditHoursFormValues = z.input<typeof EditHoursSchema>;
export type EditHoursInput = z.output<typeof EditHoursSchema>;
