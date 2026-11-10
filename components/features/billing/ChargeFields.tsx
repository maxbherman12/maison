'use client';

import { useFormContext } from 'react-hook-form';
import { TextField } from '@/components/ui/form-field';

interface TitleAndDate {
  title: string;
  date: string;
}

/** The title and date every charge has, shared by logging and editing. */
export function ChargeTitleDateFields() {
  const {
    register,
    formState: { errors },
  } = useFormContext<TitleAndDate>();

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TextField label="Title" {...register('title')} error={errors.title} />
      <TextField
        label="Date"
        type="date"
        {...register('date')}
        error={errors.date}
      />
    </div>
  );
}

/** A dollar amount input for forms whose value is named `amount`. */
export function ChargeAmountField({ hint }: { hint?: string }) {
  const {
    register,
    formState: { errors },
  } = useFormContext<{ amount: string }>();

  return (
    <TextField
      label="Amount"
      type="number"
      step="0.01"
      prefix="$"
      hint={hint}
      {...register('amount')}
      error={errors.amount}
    />
  );
}

/** An hours input for forms whose value is named `hours`. */
export function ChargeHoursField() {
  const {
    register,
    formState: { errors },
  } = useFormContext<{ hours: string }>();

  return (
    <TextField
      label="Hours"
      type="number"
      step="0.25"
      {...register('hours')}
      error={errors.hours}
    />
  );
}
