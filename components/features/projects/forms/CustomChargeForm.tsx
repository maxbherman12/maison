'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Project } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/form-field';

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  date: z.string().min(1, 'Date is required'),
  amount: z
    .number({ error: 'Enter a valid amount' })
    .positive('Amount must be greater than zero'),
});

interface CustomChargeFormProps {
  project: Project;
  isSaving?: boolean;
  onBack: () => void;
  onNext: (data: { title: string; amount: number; date: string }) => void;
}

export function CustomChargeForm({
  project,
  isSaving = false,
  onBack,
  onNext,
}: CustomChargeFormProps) {
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: 'Custom charge',
      date: new Date().toISOString().slice(0, 10),
      amount: 0,
    },
  });

  return (
    <div className="animate-in fade-in slide-in-from-right-3 duration-300">
      <h1 className="mt-6 font-serif text-4xl">Custom charge</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Add a one-time expense to <strong>{project.project}</strong>
      </p>
      <form
        onSubmit={form.handleSubmit((data) => onNext(data))}
        className="mt-10 space-y-4"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Title"
            {...form.register('title')}
            error={form.formState.errors.title}
          />
          <TextField
            label="Date"
            type="date"
            {...form.register('date')}
            error={form.formState.errors.date}
          />
        </div>
        <TextField
          label="Amount"
          type="number"
          step="0.01"
          prefix="$"
          {...form.register('amount', { valueAsNumber: true })}
          error={form.formState.errors.amount}
        />
        <div className="mt-6 flex items-center justify-between">
          <Button type="button" variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save charge'}
          </Button>
        </div>
      </form>
    </div>
  );
}
