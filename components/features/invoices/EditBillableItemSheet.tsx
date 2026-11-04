'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { FurnitureItem, FurnitureStatus, HourEntry, Project } from '@/lib/types';
import type { BillableRow } from '@/lib/billing';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import {
  SelectField,
  TextAreaField,
  TextField,
} from '@/components/ui/form-field';
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
  const hour =
    row.source === 'hours'
      ? project.hours.find((entry) => entry.id === row.itemId)
      : undefined;
  const furniture =
    row.source === 'furniture'
      ? project.furniture.find((item) => item.id === row.itemId)
      : undefined;

  if (!hour && !furniture) return null;

  return (
    <Sheet
      eyebrow={`Edit ${row.type}`}
      title={row.description}
      onClose={onClose}
      size="wide"
    >
      {hour ? (
        <HourEditForm project={project} entry={hour} onClose={onClose} />
      ) : furniture ? (
        <FurnitureEditForm
          project={project}
          item={furniture}
          onClose={onClose}
        />
      ) : null}
    </Sheet>
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

      {error && <Alert>{error}</Alert>}

      <div className="flex flex-col gap-3 pt-2 sm:flex-row">
        <Button
          type="submit"
          disabled={updateHour.isPending}
          className="w-full sm:w-auto"
        >
          {updateHour.isPending ? 'Saving...' : 'Save changes'}
        </Button>
        <Button type="button" variant="outline" onClick={onClose}>
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
      <TextAreaField
        label="Notes"
        rows={3}
        {...form.register('notes')}
        error={form.formState.errors.notes}
      />
      <SelectField
        label="Status"
        {...form.register('status')}
        error={form.formState.errors.status}
      >
        {FURNITURE_STATUSES.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </SelectField>

      {error && <Alert>{error}</Alert>}

      <div className="flex flex-col gap-3 pt-2 sm:flex-row">
        <Button
          type="submit"
          disabled={updateFurniture.isPending}
          className="w-full sm:w-auto"
        >
          {updateFurniture.isPending ? 'Saving...' : 'Save changes'}
        </Button>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
