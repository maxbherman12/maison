'use client';

import { useFormContext } from 'react-hook-form';
import type { ProjectFormValues } from '@/lib/validators/projects';
import { TextField } from '@/components/ui/form-field';

/** The project form body, shared by creating and editing a project. */
export function ProjectFields() {
  const {
    register,
    formState: { errors },
  } = useFormContext<ProjectFormValues>();

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TextField
        label="Client name"
        {...register('client')}
        error={errors.client}
      />
      <TextField
        label="Project name"
        {...register('name')}
        error={errors.name}
      />
      <TextField
        label="Address"
        {...register('address')}
        error={errors.address}
      />
      <TextField
        label="Hourly rate"
        type="number"
        step="0.01"
        prefix="$"
        {...register('hourlyRate')}
        error={errors.hourlyRate}
      />
    </div>
  );
}
