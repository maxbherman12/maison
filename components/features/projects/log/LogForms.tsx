'use client';

import type { FormEventHandler, ReactNode } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormProvider, useForm } from 'react-hook-form';
import { addFlatCharge } from '@/lib/actions/charges';
import { addFurniture } from '@/lib/actions/furniture';
import { useAction } from '@/lib/actions/use-action';
import { todayLocal } from '@/lib/domain/dates';
import { dollarsToCents } from '@/lib/domain/money';
import type { Project } from '@/lib/domain/types';
import {
  FlatChargeSchema,
  type FlatChargeFormValues,
} from '@/lib/validators/charges';
import {
  FurnitureSchema,
  type FurnitureFormValues,
} from '@/lib/validators/furniture';
import { FlowBody, FlowFooter } from '@/components/layout/FlowPanel';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  ChargeAmountField,
  ChargeTitleDateFields,
} from '@/components/features/billing/ChargeFields';
import { FurnitureFields } from '@/components/features/furniture/FurnitureFields';
import type { SavedEntry } from './ProjectLog';

interface LogFormProps {
  project: Project;
  header: ReactNode;
  onSaved: (entry: SavedEntry) => void;
}

function LogFormFrame({
  question,
  header,
  onSubmit,
  pending,
  error,
  children,
}: {
  question: string;
  header: ReactNode;
  onSubmit: FormEventHandler<HTMLFormElement>;
  pending: boolean;
  error: string | null;
  children: ReactNode;
}) {
  return (
    <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
      <FlowBody>
        {header}
        <h2 className="pt-3 pb-2.5 font-serif text-heading font-normal">{question}</h2>
        <div className="grid gap-2.5">
          {children}
          {error && <Alert>{error}</Alert>}
        </div>
      </FlowBody>
      <FlowFooter>
        <Button type="submit" size="xl" disabled={pending}>
          {pending ? 'Saving…' : 'Save'}
        </Button>
      </FlowFooter>
    </form>
  );
}

export function LogFurnitureForm({ project, header, onSaved }: LogFormProps) {
  const { run, pending, error } = useAction();
  const form = useForm<FurnitureFormValues>({
    resolver: zodResolver(FurnitureSchema, undefined, { raw: true }),
    defaultValues: {
      name: '',
      vendor: '',
      retail: '',
      trade: '',
      link: '',
      tags: '',
      notes: '',
      status: 'Pending',
    },
  });

  return (
    <FormProvider {...form}>
      <LogFormFrame
        question="What did you buy?"
        header={header}
        onSubmit={form.handleSubmit((values) =>
          run(
            () => addFurniture(project.id, values),
            ({ id }) =>
              onSaved({
                id,
                kind: 'furniture',
                amountCents: dollarsToCents(Number(values.trade)),
                summary: `${values.name}, at trade price.`,
              })
          )
        )}
        pending={pending}
        error={error}
      >
        <FurnitureFields />
      </LogFormFrame>
    </FormProvider>
  );
}

export function LogChargeForm({ project, header, onSaved }: LogFormProps) {
  const { run, pending, error } = useAction();
  const form = useForm<FlatChargeFormValues>({
    resolver: zodResolver(FlatChargeSchema, undefined, { raw: true }),
    defaultValues: { title: '', date: todayLocal(), amount: '' },
  });

  return (
    <FormProvider {...form}>
      <LogFormFrame
        question="What is the charge?"
        header={header}
        onSubmit={form.handleSubmit((values) =>
          run(
            () => addFlatCharge(project.id, values),
            ({ id }) =>
              onSaved({
                id,
                kind: 'charge',
                amountCents: dollarsToCents(Number(values.amount)),
                summary: `${values.title}.`,
              })
          )
        )}
        pending={pending}
        error={error}
      >
        <ChargeTitleDateFields />
        <ChargeAmountField />
      </LogFormFrame>
    </FormProvider>
  );
}
