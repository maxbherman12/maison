import { z } from 'zod';
import { FURNITURE_STATUSES } from '@/lib/domain/furniture';
import {
  LinkField,
  optionalMoneyField,
  optionalNullableMoneyField,
  OptionalMarkupField,
  optionalText,
  requiredText,
  TagsField,
} from './fields';

export const FurnitureStatusSchema = z.enum(FURNITURE_STATUSES);

const furnitureFields = {
  name: requiredText('Item name is required'),
  vendor: optionalText,
  retail: optionalMoneyField('Enter a valid retail price'),
  trade: optionalMoneyField('Enter a valid trade price'),
  // Both are pre-filled; the flags record whether the designer changed them.
  // An unchanged markup inherits the project's, and an unchanged price
  // follows the markup, so later changes to either still flow through.
  markup: OptionalMarkupField,
  clientPrice: optionalNullableMoneyField('Enter a valid client price'),
  customMarkup: z.boolean().default(false),
  customPrice: z.boolean().default(false),
  // Checked when the client paid the vendor: only the markup is billed.
  excludeTrade: z.boolean().default(false),
  link: LinkField,
  tags: TagsField,
  notes: optionalText,
};

type PriceFields<T> = T & {
  retail: number;
  trade: number;
  markup: number | null;
  clientPrice: number | null;
  customMarkup: boolean;
  customPrice: boolean;
};

function renamePrices<T>({
  retail,
  trade,
  markup,
  clientPrice,
  customMarkup,
  customPrice,
  ...item
}: PriceFields<T>) {
  return {
    ...item,
    retailCents: retail,
    tradeCents: trade,
    markupBps: customMarkup ? markup : null,
    clientPriceCents: customPrice ? clientPrice : null,
  };
}

export const FurnitureSchema = z
  .object({ ...furnitureFields, status: FurnitureStatusSchema })
  .transform(renamePrices);

export type FurnitureFormValues = z.input<typeof FurnitureSchema>;
export type FurnitureInput = z.output<typeof FurnitureSchema>;
