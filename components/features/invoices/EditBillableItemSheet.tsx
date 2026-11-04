'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useForm, type FieldError } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { FurnitureItem, FurnitureStatus, HourEntry, Project } from '@/lib/types';
import type { BillableRow } from '@/lib/billing';
import { Button } from '@/components/ui/button';
import {
  useUpdateFurniture,
  useUpdateHourEntry,
} from '@/lib/query/projects';

const HOUR_SCHEMA = z.object({
  title: z.string().min(1, 'Title is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid date'),
  hours: z
    .number({ error: 'Enter a valid number of hours' })
    .nonnegative('Hours cannot be negative'),
  amount: z
    .number({ error: 'Enter a valid amount' })
    .nonnegative('Amount must be non-negative'),
});

const FURNITURE_STATUSES = [
  'Pending',
  'Ordered',
  'In transit',
  'Delivered',
] as const satisfies readonly FurnitureStatus[];

const FURNITURE_SCHEMA = z.object({
  name: z.string().min(1, 'Item name is required'),
  vendor: z.string().optional(),
  retail: z
    .number({ error: 'Enter a valid retail price' })
    .nonnegative('Retail price must be non-negative'),
  trade: z
    .number({ error: 'Enter a valid trade price' })
    .nonnegative('Trade price must be non-negative'),
  link: z.string().optional(),
  tags: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(FURNITURE_STATUSES),
});

interface EditBillableItemSheetProps {
  project: Project;
  row: BillableRow;
  onClose: () => void;
}

export function EditBillableItemSheet({
  project,
  row,
  onClose,
}: EditBillableItemSheetProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  const hour =
    row.source === 'hours'
      ? project.hours.find((entry) => entry.id === row.itemId)
      : undefined;
  const furniture =
    row.source === 'furniture'
      ? project.furniture.find((item) => item.id === row.itemId)
      : undefined;

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!hour && !furniture) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-[#292923]/30 sm:items-center sm:p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-billable-item-title"
        className="max-h-sheet w-full max-w-lg overflow-y-auto overscroll-contain rounded-t-3xl bg-[#fffefa] p-6 pb-[calc(1.5rem_+_env(safe-area-inset-bottom))] sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <span className="text-[10px] uppercase tracking-[0.18em] text-[#99998e]">
              Edit {row.type}
            </span>
            <h2
              id="edit-billable-item-title"
              className="mt-1 font-serif text-3xl leading-tight"
            >
              {row.description}
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close edit sheet"
            className="flex size-11 shrink-0 items-center justify-center rounded-full border border-[#deddd5] text-[#85857a] transition-colors hover:bg-[#f1efe8] hover:text-[#292923]"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-6">
          {hour ? (
            <HourEditForm project={project} entry={hour} onClose={onClose} />
          ) : furniture ? (
            <FurnitureEditForm
              project={project}
              item={furniture}
              onClose={onClose}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function HourEditForm({
  project,
  entry,
  onClose,
}: {
  project: Project;
  entry: HourEntry;
  onClose: () => void;
}) {
  type FormValues = z.infer<typeof HOUR_SCHEMA>;
  const updateHour = useUpdateHourEntry();

  const form = useForm<FormValues>({
    resolver: zodResolver(HOUR_SCHEMA),
    defaultValues: {
      title: entry.title,
      date: entry.date,
      hours: entry.hours,
      amount: entry.amount,
    },
  });

  const error =
    updateHour.error instanceof Error ? updateHour.error.message : null;

  return (
    <form
      onSubmit={form.handleSubmit((values) =>
        updateHour.mutate(
          {
            projectId: project.id,
            hourId: entry.id,
            patch: {
              title: values.title.trim(),
              date: values.date,
              hours: values.hours,
              amount: values.amount,
            },
          },
          { onSuccess: onClose }
        )
      )}
      className="space-y-4"
    >
      <TextField
        label="Title"
        {...form.register('title')}
        error={form.formState.errors.title}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Date"
          type="date"
          {...form.register('date')}
          error={form.formState.errors.date}
        />
        <TextField
          label="Hours"
          type="number"
          step="0.25"
          {...form.register('hours', { valueAsNumber: true })}
          error={form.formState.errors.hours}
        />
      </div>
      <TextField
        label="Amount"
        type="number"
        step="0.01"
        prefix="$"
        {...form.register('amount', { valueAsNumber: true })}
        error={form.formState.errors.amount}
        hint="Editing hours does not recalculate a previously set amount."
      />

      {error && <FormError>{error}</FormError>}

      <div className="flex flex-col gap-3 pt-2 sm:flex-row">
        <Button
          type="submit"
          disabled={updateHour.isPending}
          className="h-11 w-full rounded-xl bg-[#bd765b] text-white sm:w-auto"
        >
          {updateHour.isPending ? 'Saving...' : 'Save changes'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="h-11 rounded-xl"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

function FurnitureEditForm({
  project,
  item,
  onClose,
}: {
  project: Project;
  item: FurnitureItem;
  onClose: () => void;
}) {
  type FormValues = z.infer<typeof FURNITURE_SCHEMA>;
  const updateFurniture = useUpdateFurniture();

  const form = useForm<FormValues>({
    resolver: zodResolver(FURNITURE_SCHEMA),
    defaultValues: {
      name: item.name,
      vendor: item.vendor,
      retail: item.retail,
      trade: item.trade,
      link: item.link,
      tags: item.tags.join(', '),
      notes: item.notes,
      status: item.status,
    },
  });

  const error =
    updateFurniture.error instanceof Error
      ? updateFurniture.error.message
      : null;

  return (
    <form
      onSubmit={form.handleSubmit((values) =>
        updateFurniture.mutate(
          {
            projectId: project.id,
            furnitureId: item.id,
            patch: {
              name: values.name.trim(),
              vendor: values.vendor?.trim() ?? '',
              retail: values.retail,
              trade: values.trade,
              link: values.link?.trim() ?? '',
              tags: (values.tags ?? '')
                .split(',')
                .map((tag) => tag.trim())
                .filter(Boolean),
              notes: values.notes ?? '',
              status: values.status,
            },
          },
          { onSuccess: onClose }
        )
      )}
      className="space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Item name"
          {...form.register('name')}
          error={form.formState.errors.name}
        />
        <TextField
          label="Vendor"
          {...form.register('vendor')}
          error={form.formState.errors.vendor}
        />
        <TextField
          label="Retail price"
          type="number"
          step="0.01"
          prefix="$"
          {...form.register('retail', { valueAsNumber: true })}
          error={form.formState.errors.retail}
        />
        <TextField
          label="Trade price"
          type="number"
          step="0.01"
          prefix="$"
          {...form.register('trade', { valueAsNumber: true })}
          error={form.formState.errors.trade}
        />
      </div>
      <TextField
        label="Link"
        {...form.register('link')}
        error={form.formState.errors.link}
      />
      <TextField
        label="Tags (comma-separated)"
        {...form.register('tags')}
        error={form.formState.errors.tags}
      />
      <TextArea
        label="Notes"
        rows={3}
        {...form.register('notes')}
        error={form.formState.errors.notes}
      />
      <label className="block">
        <span className="mb-2 block text-xs uppercase tracking-[0.1em] text-[#85857a]">
          Status
        </span>
        <select
          {...form.register('status')}
          className="h-11 w-full rounded-xl border border-[#deddd5] bg-[#fffefa] px-3 text-sm focus:border-[#bd765b] focus:outline-none"
        >
          {FURNITURE_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </label>

      {error && <FormError>{error}</FormError>}

      <div className="flex flex-col gap-3 pt-2 sm:flex-row">
        <Button
          type="submit"
          disabled={updateFurniture.isPending}
          className="h-11 w-full rounded-xl bg-[#bd765b] text-white sm:w-auto"
        >
          {updateFurniture.isPending ? 'Saving...' : 'Save changes'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="h-11 rounded-xl"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

function TextField({
  label,
  error,
  hint,
  prefix,
  ...props
}: {
  label: string;
  error?: FieldError;
  hint?: string;
  prefix?: string;
} & React.ComponentPropsWithRef<'input'>) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs uppercase tracking-[0.1em] text-[#85857a]">
        {label}
      </span>
      <span className="flex items-center rounded-xl border border-[#deddd5] bg-[#fffefa] focus-within:border-[#bd765b]">
        {prefix && <span className="px-3 text-sm text-[#99998e]">{prefix}</span>}
        <input
          {...props}
          className="h-11 w-full bg-transparent px-3 text-sm outline-none"
        />
      </span>
      {hint && <span className="mt-1 block text-xs text-[#99998e]">{hint}</span>}
      {error?.message && (
        <span className="mt-1 block text-xs text-destructive">
          {error.message}
        </span>
      )}
    </label>
  );
}

function TextArea({
  label,
  error,
  ...props
}: {
  label: string;
  error?: FieldError;
} & React.ComponentPropsWithRef<'textarea'>) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs uppercase tracking-[0.1em] text-[#85857a]">
        {label}
      </span>
      <textarea
        {...props}
        className="w-full rounded-xl border border-[#deddd5] bg-[#fffefa] px-3 py-2 text-sm outline-none focus:border-[#bd765b]"
      />
      {error?.message && (
        <span className="mt-1 block text-xs text-destructive">
          {error.message}
        </span>
      )}
    </label>
  );
}

function FormError({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-[#c98973] bg-[#fbf0eb] px-4 py-3 text-sm text-[#a9573d]">
      {children}
    </p>
  );
}
