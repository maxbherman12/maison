import { z } from 'zod';
import { moneyField, optionalText, requiredText } from './fields';

export const ProjectSchema = z
  .object({
    client: requiredText('Client name is required'),
    name: requiredText('Project name is required'),
    address: optionalText,
    hourlyRate: moneyField('Hourly rate must be greater than zero', 'positive'),
  })
  .transform(({ hourlyRate, ...project }) => ({
    ...project,
    hourlyRateCents: hourlyRate,
  }));

export type ProjectFormValues = z.input<typeof ProjectSchema>;
export type ProjectInput = z.output<typeof ProjectSchema>;
