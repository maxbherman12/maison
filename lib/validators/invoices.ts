import { z } from 'zod';

export const GenerateInvoiceSchema = z.object({
  projectId: z.string().min(1, 'Project is required'),
  client: z.string().min(1, 'Client name is required'),
  project: z.string().min(1, 'Project name is required'),
  total: z.number().positive('Total must be greater than zero'),
  items: z
    .array(
      z.object({
        title: z.string().min(1, 'Line item title is required'),
        amount: z.number().nonnegative('Amount must be non-negative'),
      })
    )
    .min(1, 'Invoice must have at least one line item'),
});

export type GenerateInvoiceInput = z.infer<typeof GenerateInvoiceSchema>;

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
