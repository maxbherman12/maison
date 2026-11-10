import { z } from 'zod';
import { dollarsToCents } from '@/lib/domain/money';

/**
 * Building blocks for the form schemas. Every schema in this folder is run
 * twice on the same raw form values: by the resolver in the browser for
 * instant feedback, and by the Server Action as the actual boundary. Numeric
 * inputs therefore arrive as strings, and the conversion to cents happens only
 * in the action's parse.
 */

/** $1M per field keeps invoice totals well inside a Postgres integer. */
const MAX_DOLLARS = 1_000_000;
const MAX_HOURS = 9_999;

export const IdSchema = z.uuid('Invalid id');

export function requiredText(message: string) {
  return z.string().trim().min(1, message);
}

export const optionalText = z.string().trim().default('');

export const DateField = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid date')
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Enter a valid date');

function parseNumber(value: string): number {
  return value === '' ? Number.NaN : Number(value);
}

function moneyIsValid(dollars: number, min: 'zero' | 'positive'): boolean {
  if (!Number.isFinite(dollars) || dollars > MAX_DOLLARS) return false;
  return min === 'positive' ? dollars > 0 : dollars >= 0;
}

/** A required dollar input that yields cents. */
export function moneyField(message: string, min: 'zero' | 'positive' = 'zero') {
  return z
    .string()
    .trim()
    .refine((value) => moneyIsValid(parseNumber(value), min), message)
    .transform((value) => dollarsToCents(Number(value)));
}

/** A dollar input that may be left blank, which means zero. */
export function optionalMoneyField(message: string) {
  return z
    .string()
    .trim()
    .refine((value) => value === '' || moneyIsValid(Number(value), 'zero'), message)
    .transform((value) => dollarsToCents(Number(value)));
}

export const HoursField = z
  .string()
  .trim()
  .refine((value) => {
    const hours = parseNumber(value);
    return Number.isFinite(hours) && hours > 0 && hours <= MAX_HOURS;
  }, 'Enter a number of hours greater than zero')
  .transform((value) => Math.round(Number(value) * 100) / 100);

/** A blank or http(s) link. A bare domain is treated as https. */
export const LinkField = z
  .string()
  .trim()
  .transform((value) =>
    value === '' || /^[a-z][a-z0-9+.-]*:/i.test(value)
      ? value
      : `https://${value}`
  )
  .refine((value) => {
    if (value === '') return true;
    const url = URL.parse(value);
    return url !== null && ['http:', 'https:'].includes(url.protocol);
  }, 'Enter a valid web link');

/** A comma-separated input that yields a list of tags. */
export const TagsField = z.string().transform((value) =>
  value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
);
