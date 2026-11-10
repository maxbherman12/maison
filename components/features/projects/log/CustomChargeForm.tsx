'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { FormProvider, useForm } from 'react-hook-form';
import { addFlatCharge } from '@/lib/actions/charges';
import { useAction } from '@/lib/actions/use-action';
import { todayLocal } from '@/lib/domain/dates';
import {
  FlatChargeSchema,
  type FlatChargeFormValues,
} from '@/lib/validators/charges';
import {
  ChargeAmountField,
  ChargeTitleDateFields,
} from '@/components/features/billing/ChargeFields';
import { LogFormFrame, type LogFormProps } from './LogFormFrame';

export function CustomChargeForm({ project, onBack, onSaved }: LogFormProps) {
  const { run, pending, error } = useAction();
  const form = useForm<FlatChargeFormValues>({
    resolver: zodResolver(FlatChargeSchema, undefined, { raw: true }),
    defaultValues: { title: 'Custom charge', date: todayLocal(), amount: '' },
  });

  return (
    <FormProvider {...form}>
      <LogFormFrame
        title="Custom charge"
        intro="Add a one-time expense to"
        project={project}
        onBack={onBack}
        onSubmit={form.handleSubmit((values) =>
          run(() => addFlatCharge(project.id, values), onSaved)
        )}
        saveLabel="Save charge"
        pending={pending}
        error={error}
      >
        <ChargeTitleDateFields />
        <ChargeAmountField />
      </LogFormFrame>
    </FormProvider>
  );
}
