import { z } from 'zod';

const BillableRefSchema = z.object({
  id: z.string().min(1, 'Line item id is required'),
  source: z.enum(['hours', 'furniture']),
});

export const GenerateInvoiceSchema = z
  .object({
    projectId: z.string().min(1, 'Project is required'),
    // Only source references are accepted. Titles and amounts are derived on
    // the server from the referenced rows.
    items: z
      .array(BillableRefSchema)
      .min(1, 'Invoice must have at least one line item'),
  })
  .superRefine((value, ctx) => {
    const seen = new Set<string>();
    for (const item of value.items) {
      const key = `${item.source}:${item.id}`;
      if (seen.has(key)) {
        ctx.addIssue({
          code: 'custom',
          message: 'Invoice contains duplicate line items',
          path: ['items'],
        });
        return;
      }
      seen.add(key);
    }
  });

export type GenerateInvoiceRequest = z.infer<typeof GenerateInvoiceSchema>;

export const MarkInvoiceSchema = z.object({
  action: z.enum(['send', 'pay']),
});

export type MarkInvoiceRequest = z.infer<typeof MarkInvoiceSchema>;

export const InvoiceListQuerySchema = z.object({
  projectId: z.string().min(1, 'Project is required'),
});

const DateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD');

export const UpdateHourEntrySchema = z
  .object({
    title: z.string().min(1, 'Title is required').optional(),
    date: DateSchema.optional(),
    hours: z.number().nonnegative('Hours cannot be negative').optional(),
    amount: z
      .number()
      .nonnegative('Amount must be non-negative')
      .optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'No fields to update',
  });

export type UpdateHourEntryRequest = z.infer<typeof UpdateHourEntrySchema>;

const FurnitureStatusSchema = z.enum([
  'Pending',
  'Ordered',
  'In transit',
  'Delivered',
]);

export const UpdateFurnitureSchema = z
  .object({
    name: z.string().min(1, 'Furniture name is required').optional(),
    vendor: z.string().optional(),
    retail: z.number().nonnegative('Retail price must be non-negative').optional(),
    trade: z.number().nonnegative('Trade price must be non-negative').optional(),
    link: z.string().optional(),
    tags: z.array(z.string()).optional(),
    notes: z.string().optional(),
    status: FurnitureStatusSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'No fields to update',
  });

export type UpdateFurnitureRequest = z.infer<typeof UpdateFurnitureSchema>;

export const CreateProjectSchema = z.object({
  client: z.string().min(1, 'Client name is required'),
  project: z.string().min(1, 'Project name is required'),
  address: z.string().optional(),
  hourlyRate: z.number().positive('Hourly rate must be greater than zero'),
});

export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;

export const LogHoursSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  date: z.string().min(1, 'Date is required'),
  hours: z.number().nonnegative('Hours cannot be negative'),
  amount: z.number().nonnegative('Amount must be non-negative').optional(),
});

export type LogHoursInput = z.infer<typeof LogHoursSchema>;

export const AddFurnitureSchema = z.object({
  name: z.string().min(1, 'Furniture name is required'),
  vendor: z.string().optional(),
  retail: z.number().nonnegative('Retail price must be non-negative'),
  trade: z.number().nonnegative('Trade price must be non-negative'),
  link: z.string().optional(),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional(),
});

export type AddFurnitureInput = z.infer<typeof AddFurnitureSchema>;
