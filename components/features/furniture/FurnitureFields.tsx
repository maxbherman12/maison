'use client';

import { useFormContext } from 'react-hook-form';
import type { AddFurnitureFormValues } from '@/lib/validators/furniture';
import { TextAreaField, TextField } from '@/components/ui/form-field';

/** The furniture form body, shared by logging and editing a piece. */
export function FurnitureFields() {
  const {
    register,
    formState: { errors },
  } = useFormContext<AddFurnitureFormValues>();

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Item name" {...register('name')} error={errors.name} />
        <TextField label="Vendor" {...register('vendor')} error={errors.vendor} />
        <TextField
          label="Retail price"
          type="number"
          step="0.01"
          prefix="$"
          {...register('retail')}
          error={errors.retail}
        />
        <TextField
          label="Trade price"
          type="number"
          step="0.01"
          prefix="$"
          {...register('trade')}
          error={errors.trade}
        />
      </div>
      <TextField label="Link" {...register('link')} error={errors.link} />
      <TextField
        label="Tags (comma-separated)"
        {...register('tags')}
        error={errors.tags}
      />
      <TextAreaField
        label="Notes"
        rows={3}
        {...register('notes')}
        error={errors.notes}
      />
    </>
  );
}
