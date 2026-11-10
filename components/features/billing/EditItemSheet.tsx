'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormProvider, useForm } from 'react-hook-form';
import {
  deleteCharge,
  updateFlatCharge,
  updateHours,
} from '@/lib/actions/charges';
import { updateFurniture } from '@/lib/actions/furniture';
import { useAction } from '@/lib/actions/use-action';
import { FURNITURE_STATUSES } from '@/lib/domain/furniture';
import { centsToInput } from '@/lib/domain/money';
import type {
  Charge,
  FurnitureItem,
  ProjectDetail,
} from '@/lib/domain/types';
import {
  EditHoursSchema,
  FlatChargeSchema,
  type EditHoursFormValues,
  type FlatChargeFormValues,
} from '@/lib/validators/charges';
import {
  EditFurnitureSchema,
  type EditFurnitureFormValues,
} from '@/lib/validators/furniture';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { SelectField } from '@/components/ui/form-field';
import { Sheet } from '@/components/ui/sheet';
import { FurnitureFields } from '@/components/features/furniture/FurnitureFields';
import {
  ChargeAmountField,
  ChargeHoursField,
  ChargeTitleDateFields,
} from './ChargeFields';

interface EditItemSheetProps {
  project: ProjectDetail;
  itemId: string;
  onClose: () => void;
}

/** Edits any pending item on a project. Renders nothing if the item has gone. */
export function EditItemSheet({ project, itemId, onClose }: EditItemSheetProps) {
  const charge = project.charges.find((row) => row.id === itemId);
  if (charge) return <EditChargeSheet charge={charge} onClose={onClose} />;

  const furniture = project.furniture.find((row) => row.id === itemId);
  if (furniture) return <EditFurnitureSheet item={furniture} onClose={onClose} />;

  return null;
}

function EditChargeSheet({
  charge,
  onClose,
}: {
  charge: Charge;
  onClose: () => void;
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const remove = useAction();

  if (confirmingDelete) {
    return (
      <ConfirmDialog
        title="Delete this entry?"
        description={`This will remove ${charge.title} from the project. This cannot be undone.`}
        confirmLabel="Delete entry"
        tone="destructive"
        pending={remove.pending}
        error={remove.error}
        onClose={() => setConfirmingDelete(false)}
        onConfirm={() => remove.run(() => deleteCharge(charge.id), onClose)}
      />
    );
  }

  const isHours = charge.hours !== null;
  const onDelete = () => setConfirmingDelete(true);

  return (
    <Sheet
      eyebrow={isHours ? 'Edit hours' : 'Edit charge'}
      title={charge.title}
      onClose={onClose}
      size="wide"
    >
      {isHours ? (
        <HoursEditForm charge={charge} onClose={onClose} onDelete={onDelete} />
      ) : (
        <FlatChargeEditForm
          charge={charge}
          onClose={onClose}
          onDelete={onDelete}
        />
      )}
    </Sheet>
  );
}

interface ChargeFormProps {
  charge: Charge;
  onClose: () => void;
  onDelete: () => void;
}

function HoursEditForm({ charge, onClose, onDelete }: ChargeFormProps) {
  const { run, pending, error } = useAction();
  const form = useForm<EditHoursFormValues>({
    resolver: zodResolver(EditHoursSchema, undefined, { raw: true }),
    defaultValues: {
      title: charge.title,
      date: charge.date,
      hours: String(charge.hours),
      amount: centsToInput(charge.amountCents),
    },
  });

  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit((values) =>
          run(() => updateHours(charge.id, values), onClose)
        )}
        className="space-y-4"
      >
        <ChargeTitleDateFields />
        <ChargeHoursField />
        <ChargeAmountField hint="Editing hours does not recalculate the amount." />
        <FormFooter
          error={error}
          pending={pending}
          onClose={onClose}
          onDelete={onDelete}
        />
      </form>
    </FormProvider>
  );
}

function FlatChargeEditForm({ charge, onClose, onDelete }: ChargeFormProps) {
  const { run, pending, error } = useAction();
  const form = useForm<FlatChargeFormValues>({
    resolver: zodResolver(FlatChargeSchema, undefined, { raw: true }),
    defaultValues: {
      title: charge.title,
      date: charge.date,
      amount: centsToInput(charge.amountCents),
    },
  });

  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit((values) =>
          run(() => updateFlatCharge(charge.id, values), onClose)
        )}
        className="space-y-4"
      >
        <ChargeTitleDateFields />
        <ChargeAmountField />
        <FormFooter
          error={error}
          pending={pending}
          onClose={onClose}
          onDelete={onDelete}
        />
      </form>
    </FormProvider>
  );
}

function EditFurnitureSheet({
  item,
  onClose,
}: {
  item: FurnitureItem;
  onClose: () => void;
}) {
  const { run, pending, error } = useAction();
  const form = useForm<EditFurnitureFormValues>({
    resolver: zodResolver(EditFurnitureSchema, undefined, { raw: true }),
    defaultValues: {
      name: item.name,
      vendor: item.vendor,
      retail: centsToInput(item.retailCents),
      trade: centsToInput(item.tradeCents),
      link: item.link,
      tags: item.tags.join(', '),
      notes: item.notes,
      status: item.status,
    },
  });

  return (
    <Sheet eyebrow="Edit furniture" title={item.name} onClose={onClose} size="wide">
      <FormProvider {...form}>
        <form
          onSubmit={form.handleSubmit((values) =>
            run(() => updateFurniture(item.id, values), onClose)
          )}
          className="space-y-4"
        >
          <FurnitureFields />
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
          <FormFooter error={error} pending={pending} onClose={onClose} />
        </form>
      </FormProvider>
    </Sheet>
  );
}

function FormFooter({
  error,
  pending,
  onClose,
  onDelete,
}: {
  error: string | null;
  pending: boolean;
  onClose: () => void;
  onDelete?: () => void;
}) {
  return (
    <>
      {error && <Alert>{error}</Alert>}
      <div className="flex flex-col gap-3 pt-2 sm:flex-row">
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {pending ? 'Saving…' : 'Save changes'}
        </Button>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        {onDelete && (
          <Button
            type="button"
            variant="destructive"
            onClick={onDelete}
            className="sm:ml-auto"
          >
            Delete
          </Button>
        )}
      </div>
    </>
  );
}
