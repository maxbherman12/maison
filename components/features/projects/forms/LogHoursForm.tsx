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
  hours: z
    .number({ error: 'Enter a valid number of hours' })
    .positive('Hours must be greater than zero'),
});

interface LogHoursFormProps {
  project: Project;
  isSaving?: boolean;
  onBack: () => void;
  onNext: (data: { title: string; hours: number; date: string }) => void;
}

export function LogHoursForm({
  project,
  isSaving = false,
  onBack,
  onNext,
}: LogHoursFormProps) {
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: 'Design work',
      date: new Date().toISOString().slice(0, 10),
      hours: 3.5,
    },
  });

  const amount = (form.watch('hours') || 0) * project.hourlyRate;

  return (
    <div className="animate-in fade-in slide-in-from-right-3 duration-300">
      <h1 className="mt-6 font-serif text-4xl">Log hours</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Track billable time for <strong>{project.project}</strong>
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
          label="Hours"
          type="number"
          step="0.5"
          {...form.register('hours', { valueAsNumber: true })}
          error={form.formState.errors.hours}
        />
        <div className="rounded-xl border border-border bg-secondary p-5">
          <p className="text-sm text-muted-foreground">
            Estimated amount:{' '}
            <span className="font-serif text-xl text-foreground">
              {amount.toLocaleString('en-US', {
                style: 'currency',
                currency: 'USD',
                maximumFractionDigits: 0,
              })}
            </span>
          </p>
        </div>
        <div className="mt-6 flex items-center justify-between">
          <Button type="button" variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save hours'}
          </Button>
        </div>
      </form>
    </div>
  );
}
