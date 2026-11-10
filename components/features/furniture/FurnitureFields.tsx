'use client';

import { useFormContext } from 'react-hook-form';
import {
  FURNITURE_STATUSES,
  FURNITURE_STATUS_LABELS,
  type FurnitureStatus,
} from '@/lib/domain/furniture';
import type { FurnitureFormValues } from '@/lib/validators/furniture';
import { TextAreaField, TextField } from '@/components/ui/form-field';

/** All four stages at once, so choosing one is a single tap. */
export function FurnitureStatusField() {
  const { register } = useFormContext<{ status: FurnitureStatus }>();

  return (
    <fieldset>
      <legend className="text-label text-muted-foreground">Status</legend>
      <div className="mt-1.5 grid grid-cols-4 border border-border">
        {FURNITURE_STATUSES.map((status) => (
          <label
            key={status}
            className="flex min-h-11 cursor-pointer items-center justify-center text-label transition-colors has-checked:bg-primary has-checked:text-primary-foreground has-focus-visible:outline-2 has-focus-visible:outline-foreground"
          >
            <input
              type="radio"
              value={status}
              className="sr-only"
              {...register('status')}
            />
            {FURNITURE_STATUS_LABELS[status]}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function FurniturePieceFields() {
  const {
    register,
    formState: { errors },
  } = useFormContext<FurnitureFormValues>();

  return (
    <>
      <TextField label="Piece" {...register('name')} error={errors.name} />
      <TextField label="Vendor" {...register('vendor')} error={errors.vendor} />
    </>
  );
}

export function FurniturePriceFields() {
  const {
    register,
    formState: { errors },
  } = useFormContext<FurnitureFormValues>();

  return (
    <div className="grid grid-cols-2 gap-4">
      <TextField
        label="Trade price"
        type="number"
        step="0.01"
        inputMode="decimal"
        prefix="$"
        {...register('trade')}
        error={errors.trade}
      />
      <TextField
        label="Retail price"
        type="number"
        step="0.01"
        inputMode="decimal"
        prefix="$"
        {...register('retail')}
        error={errors.retail}
      />
    </div>
  );
}

export function FurnitureExtraFields() {
  const {
    register,
    formState: { errors },
  } = useFormContext<FurnitureFormValues>();

  return (
    <>
      <TextField label="Link" {...register('link')} error={errors.link} />
      <TextField
        label="Tags, separated by commas"
        {...register('tags')}
        error={errors.tags}
      />
      <TextAreaField
        label="Notes"
        rows={2}
        {...register('notes')}
        error={errors.notes}
      />
    </>
  );
}

/** Every field on one screen, for editing a piece. */
export function FurnitureFields() {
  return (
    <>
      <FurniturePieceFields />
      <FurniturePriceFields />
      <FurnitureStatusField />
      <details>
        <summary className="flex min-h-8 cursor-pointer items-center text-label underline underline-offset-3">
          Link, tags and notes
        </summary>
        <div className="grid gap-2.5 pt-1">
          <FurnitureExtraFields />
        </div>
      </details>
    </>
  );
}
