'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Project, AddFurnitureInput } from '@/lib/types';
import { Button } from '@/components/ui/button';
import type { FieldError } from 'react-hook-form';

const schema = z.object({
  name: z.string().min(1, 'Item name is required'),
  vendor: z.string().optional(),
  retail: z
    .string()
    .optional()
    .refine(
      (val) => val === '' || val === undefined || Number(val) >= 0,
      'Retail price must be non-negative'
    ),
  trade: z
    .string()
    .optional()
    .refine(
      (val) => val === '' || val === undefined || Number(val) >= 0,
      'Trade price must be non-negative'
    ),
  link: z.string().optional(),
  tags: z.string().optional(),
  notes: z.string().optional(),
});

interface AddFurnitureFormProps {
  project: Project;
  onBack: () => void;
  onNext: (data: AddFurnitureInput) => void;
}

export function AddFurnitureForm({
  project,
  onBack,
  onNext,
}: AddFurnitureFormProps) {
  type FormValues = z.infer<typeof schema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      vendor: '',
      retail: '',
      trade: '',
      link: '',
      tags: '',
      notes: '',
    } as FormValues,
  });

  return (
    <div className="animate-in fade-in slide-in-from-right-3 duration-300">
      <h1 className="mt-6 font-serif text-4xl">Log furniture</h1>
      <p className="mt-2 text-sm text-[#85857a]">
        Track a furniture purchase for <strong>{project.project}</strong>
      </p>
      <form
        onSubmit={
          form.handleSubmit((data) => {
            onNext({
              name: data.name,
              vendor: data.vendor ?? '',
              retail: Number(data.retail ?? 0),
              trade: Number(data.trade ?? 0),
              link: data.link ?? '',
              tags: data.tags
                ? data.tags.split(',').map((t) => t.trim()).filter(Boolean)
                : [],
              notes: data.notes ?? '',
            });
          })
        }
        className="mt-10 space-y-4"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Item name"
            {...form.register('name')}
            error={form.formState.errors.name}
          />
          <FormField
            label="Vendor"
            {...form.register('vendor')}
            error={form.formState.errors.vendor}
          />
          <FormField
            label="Retail price"
            type="number"
            prefix="$"
            {...form.register('retail')}
            error={form.formState.errors.retail}
          />
          <FormField
            label="Trade price"
            type="number"
            prefix="$"
            {...form.register('trade')}
            error={form.formState.errors.trade}
          />
        </div>
        <FormField label="Link" {...form.register('link')} error={form.formState.errors.link} />
        <FormField
          label="Tags (comma-separated)"
          {...form.register('tags')}
          error={form.formState.errors.tags}
        />
        <FormField label="Notes" {...form.register('notes')} error={form.formState.errors.notes} />
      </form>
      <div className="mt-10 flex items-center justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button type="submit" className="bg-[#bd765b] text-white">
          Save furniture
        </Button>
      </div>
    </div>
  );
}

function FormField({
  label,
  type = 'text',
  prefix,
  placeholder,
  error,
  ...props
}: {
  label: string;
  type?: string;
  prefix?: string;
  placeholder?: string;
  error?: FieldError | undefined;
  [key: string]: unknown;
}) {
  return (
    <div className="space-y-1">
      <span className="text-xs uppercase tracking-[0.1em] text-[#85857a]">{label}</span>
      <div className="flex items-center rounded-xl border border-[#deddd5] bg-[#fffefa] focus-within:border-[#bd765b]">
        {prefix && <span className="text-sm text-[#99998e] px-3">{prefix}</span>}
        <input
          type={type}
          placeholder={placeholder}
          className="h-11 w-full bg-transparent px-1 text-sm outline-none"
          {...(props as Record<string, unknown>)}
        />
      </div>
      {error?.message && <p className="text-xs text-destructive">{error.message}</p>}
    </div>
  );
}
