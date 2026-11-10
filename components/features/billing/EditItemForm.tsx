'use client';

import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormProvider, useForm } from 'react-hook-form';
import {
  deleteCharge,
  updateFlatCharge,
  updateHours,
} from '@/lib/actions/charges';
import {
  deleteFurniture,
  moveFurniture,
  updateFurniture,
} from '@/lib/actions/furniture';
import type { ActionResult } from '@/lib/actions/result';
import { useAction } from '@/lib/actions/use-action';
import type { FurnitureStatus } from '@/lib/domain/furniture';
import { centsToInput, formatMoney } from '@/lib/domain/money';
import type { Charge, FurnitureItem } from '@/lib/domain/types';
import {
  EditHoursSchema,
  FlatChargeSchema,
  type EditHoursFormValues,
  type FlatChargeFormValues,
} from '@/lib/validators/charges';
import {
  FurnitureSchema,
  type FurnitureFormValues,
} from '@/lib/validators/furniture';
import { FlowBack, FlowBody, FlowFooter } from '@/components/layout/FlowPanel';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  FurnitureFields,
  FurnitureStatusField,
} from '@/components/features/furniture/FurnitureFields';
import {
  ChargeAmountField,
  ChargeHoursField,
  ChargeTitleDateFields,
} from './ChargeFields';

interface FormProps {
  closeHref: string;
}

/** The back link, heading, and footer every edit screen shares. */
function EditFrame({
  title,
  closeHref,
  onSubmit,
  onDelete,
  pending,
  error,
  children,
}: FormProps & {
  title: string;
  onSubmit: () => void;
  onDelete?: () => Promise<ActionResult>;
  pending: boolean;
  error: string | null;
  children: ReactNode;
}) {
  const router = useRouter();
  const remove = useAction();
  const [confirming, setConfirming] = useState(false);
  const shownError = error ?? remove.error;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className="flex min-h-0 flex-1 flex-col"
    >
      <FlowBody>
        <div>
          <FlowBack href={closeHref} />
        </div>
        <h2 className="pt-3 pb-2.5 font-serif text-heading font-normal">{title}</h2>
        <div className="grid gap-2.5">
          {children}
          {shownError && <Alert>{shownError}</Alert>}
        </div>
      </FlowBody>

      <FlowFooter>
        {confirming && onDelete ? (
          <>
            <Button
              type="button"
              variant="outline"
              size="xl"
              onClick={() => setConfirming(false)}
            >
              Keep it
            </Button>
            <Button
              type="button"
              size="xl"
              disabled={remove.pending}
              onClick={() =>
                remove.run(onDelete, () => router.push(closeHref))
              }
              className="bg-destructive text-white"
            >
              {remove.pending ? 'Deleting…' : 'Confirm delete'}
            </Button>
          </>
        ) : (
          <>
            {onDelete && (
              <Button
                type="button"
                variant="destructive"
                size="xl"
                onClick={() => setConfirming(true)}
              >
                Delete
              </Button>
            )}
            <Button type="submit" size="xl" disabled={pending}>
              {pending ? 'Saving…' : 'Save changes'}
            </Button>
          </>
        )}
      </FlowFooter>
    </form>
  );
}

export function EditHoursForm({ charge, closeHref }: FormProps & { charge: Charge }) {
  const router = useRouter();
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
      <EditFrame
        title="Edit time"
        closeHref={closeHref}
        onSubmit={form.handleSubmit((values) =>
          run(() => updateHours(charge.id, values), () => router.push(closeHref))
        )}
        onDelete={() => deleteCharge(charge.id)}
        pending={pending}
        error={error}
      >
        <ChargeTitleDateFields />
        <ChargeHoursField />
        <ChargeAmountField hint="Changing the hours does not change the amount." />
      </EditFrame>
    </FormProvider>
  );
}

export function EditChargeForm({ charge, closeHref }: FormProps & { charge: Charge }) {
  const router = useRouter();
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
      <EditFrame
        title="Edit charge"
        closeHref={closeHref}
        onSubmit={form.handleSubmit((values) =>
          run(() => updateFlatCharge(charge.id, values), () => router.push(closeHref))
        )}
        onDelete={() => deleteCharge(charge.id)}
        pending={pending}
        error={error}
      >
        <ChargeTitleDateFields />
        <ChargeAmountField />
      </EditFrame>
    </FormProvider>
  );
}

export function EditFurnitureForm({
  item,
  closeHref,
}: FormProps & { item: FurnitureItem }) {
  const router = useRouter();
  const { run, pending, error } = useAction();
  const form = useForm<FurnitureFormValues>({
    resolver: zodResolver(FurnitureSchema, undefined, { raw: true }),
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
    <FormProvider {...form}>
      <EditFrame
        title="Edit piece"
        closeHref={closeHref}
        onSubmit={form.handleSubmit((values) =>
          run(() => updateFurniture(item.id, values), () => router.push(closeHref))
        )}
        onDelete={() => deleteFurniture(item.id)}
        pending={pending}
        error={error}
      >
        <FurnitureFields />
      </EditFrame>
    </FormProvider>
  );
}

/** A piece already on an invoice: delivery continues, so only status can change. */
export function InvoicedFurnitureForm({
  item,
  closeHref,
}: FormProps & { item: FurnitureItem }) {
  const router = useRouter();
  const { run, pending, error } = useAction();
  const form = useForm<{ status: FurnitureStatus }>({
    defaultValues: { status: item.status },
  });

  return (
    <FormProvider {...form}>
      <EditFrame
        title={item.name}
        closeHref={closeHref}
        onSubmit={form.handleSubmit(({ status }) =>
          run(() => moveFurniture(item.id, status), () => router.push(closeHref))
        )}
        pending={pending}
        error={error}
      >
        <p className="text-muted-foreground">
          {[item.vendor, `Trade ${formatMoney(item.tradeCents)}`, `Retail ${formatMoney(item.retailCents)}`]
            .filter(Boolean)
            .join(' · ')}
        </p>
        <FurnitureStatusField />
        <p className="text-label text-muted-foreground">
          This piece is on an invoice, so only its status can change.
        </p>
      </EditFrame>
    </FormProvider>
  );
}
