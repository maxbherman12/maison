'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { FormProvider, useForm } from 'react-hook-form';
import { logHours } from '@/lib/actions/charges';
import { useAction } from '@/lib/actions/use-action';
import { todayLocal } from '@/lib/domain/dates';
import { chargeForHours, formatMoney } from '@/lib/domain/money';
import {
  LogHoursSchema,
  type LogHoursFormValues,
} from '@/lib/validators/charges';
import {
  ChargeHoursField,
  ChargeTitleDateFields,
} from '@/components/features/billing/ChargeFields';
import { LogFormFrame, type LogFormProps } from './LogFormFrame';

export function LogHoursForm({ project, onBack, onSaved }: LogFormProps) {
  const { run, pending, error } = useAction();
  const form = useForm<LogHoursFormValues>({
    resolver: zodResolver(LogHoursSchema, undefined, { raw: true }),
    defaultValues: { title: 'Design work', date: todayLocal(), hours: '3.5' },
  });

  const estimate = chargeForHours(
    Number(form.watch('hours')) || 0,
    project.hourlyRateCents
  );

  return (
    <FormProvider {...form}>
      <LogFormFrame
        title="Log hours"
        intro="Track billable time for"
        project={project}
        onBack={onBack}
        onSubmit={form.handleSubmit((values) =>
          run(() => logHours(project.id, values), onSaved)
        )}
        saveLabel="Save hours"
        pending={pending}
        error={error}
      >
        <ChargeTitleDateFields />
        <ChargeHoursField />
        <div className="rounded-xl border border-border bg-secondary p-5">
          <p className="text-sm text-muted-foreground">
            Estimated amount:{' '}
            <span className="font-serif text-xl text-foreground">
              {formatMoney(estimate)}
            </span>
          </p>
        </div>
      </LogFormFrame>
    </FormProvider>
  );
}
