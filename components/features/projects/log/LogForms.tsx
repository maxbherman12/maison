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
import {
  FurnitureExtraFields,
  FurniturePieceFields,
  FurniturePriceFields,
  FurnitureStatusField,
} from '@/components/features/furniture/FurnitureFields';
import type { SavedEntry } from './ProjectLog';

interface LogFormProps {
  project: Project;
  header: ReactNode;
  onSaved: (entry: SavedEntry) => void;
}

export function LogFormFrame({
  question,
  header,
  onSubmit,
  pending,
  error,
  submitLabel = 'Save',
  children,
}: {
  question: string;
  header: ReactNode;
  onSubmit: FormEventHandler<HTMLFormElement>;
  pending: boolean;
  error: string | null;
  submitLabel?: string;
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
          {pending ? 'Saving…' : submitLabel}
        </Button>
      </FlowFooter>
    </form>
  );
}

const FURNITURE_STAGES = {
  piece: {
    question: 'What did you buy?',
    fields: ['name', 'vendor', 'trade', 'retail'],
    body: (
      <>
        <FurniturePieceFields />
        <FurniturePriceFields />
      </>
    ),
  },
  details: {
    question: 'Any last details?',
    fields: ['status', 'link', 'tags', 'notes'],
    body: (
      <>
        <FurnitureStatusField />
        <FurnitureExtraFields />
      </>
    ),
  },
} satisfies Record<
  string,
  { question: string; fields: (keyof FurnitureFormValues)[]; body: ReactNode }
>;

export type FurnitureStage = keyof typeof FURNITURE_STAGES;

export function LogFurnitureForm({
  project,
  header,
  onSaved,
  stage,
  onNext,
}: LogFormProps & { stage: FurnitureStage; onNext: () => void }) {
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
  const { question, fields, body } = FURNITURE_STAGES[stage];
  const isLastStage = stage === 'details';

  const save = form.handleSubmit((values) =>
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
  );

  const submit: FormEventHandler<HTMLFormElement> = async (event) => {
    if (isLastStage) return save(event);
    event.preventDefault();
    if (await form.trigger(fields, { shouldFocus: true })) onNext();
  };

  return (
    <FormProvider {...form}>
      <LogFormFrame
        question={question}
        header={header}
        onSubmit={submit}
        pending={pending}
        error={error}
        submitLabel={isLastStage ? 'Save' : 'Next'}
      >
        {body}
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
