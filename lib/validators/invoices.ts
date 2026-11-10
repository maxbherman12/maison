import { z } from 'zod';
import { IdSchema } from './fields';

/**
 * The client only says which items to bill. Titles and amounts are always read
 * from the database inside the invoice transaction.
 */
export const GenerateInvoiceSchema = z.object({
  projectId: IdSchema,
  itemIds: z
    .array(IdSchema)
    .min(1, 'Select at least one item')
    .refine(
      (ids) => new Set(ids).size === ids.length,
      'Invoice contains duplicate items'
    ),
});

export type GenerateInvoiceInput = z.output<typeof GenerateInvoiceSchema>;
