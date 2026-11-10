import { z } from 'zod';
import { FURNITURE_STATUSES } from '@/lib/domain/furniture';
import {
  LinkField,
  optionalMoneyField,
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
  link: LinkField,
  tags: TagsField,
  notes: optionalText,
};

type PriceFields<T> = T & { retail: number; trade: number };

function renamePrices<T>({ retail, trade, ...item }: PriceFields<T>) {
  return { ...item, retailCents: retail, tradeCents: trade };
}

export const FurnitureSchema = z
  .object({ ...furnitureFields, status: FurnitureStatusSchema })
  .transform(renamePrices);

export type FurnitureFormValues = z.input<typeof FurnitureSchema>;
export type FurnitureInput = z.output<typeof FurnitureSchema>;
