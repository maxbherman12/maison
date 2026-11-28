import { z } from 'zod';
import { PAINT_NAMES } from '@/lib/domain/paints';
import {
  MarkupField,
  moneyField,
  OptionalEmailField,
  optionalText,
  requiredText,
} from './fields';

const MAX_PHONE = 50;

export const ProjectSchema = z
  .object({
    client: requiredText('Client name is required'),
    name: requiredText('Project name is required'),
    address: optionalText,
    clientEmail: OptionalEmailField,
    clientPhone: optionalText.pipe(
      z.string().max(MAX_PHONE, `Keep the phone under ${MAX_PHONE} characters`)
    ),
    hourlyRate: moneyField('Hourly rate must be greater than zero', 'positive'),
    markup: MarkupField,
    paint: z.enum(PAINT_NAMES),
  })
  .transform(({ hourlyRate, markup, ...project }) => ({
    ...project,
    hourlyRateCents: hourlyRate,
    markupBps: markup,
  }));

export type ProjectFormValues = z.input<typeof ProjectSchema>;
export type ProjectInput = z.output<typeof ProjectSchema>;
