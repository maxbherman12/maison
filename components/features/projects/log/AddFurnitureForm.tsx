'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { FormProvider, useForm } from 'react-hook-form';
import { addFurniture } from '@/lib/actions/furniture';
import { useAction } from '@/lib/actions/use-action';
import {
  AddFurnitureSchema,
  type AddFurnitureFormValues,
} from '@/lib/validators/furniture';
import { FurnitureFields } from '@/components/features/furniture/FurnitureFields';
import { LogFormFrame, type LogFormProps } from './LogFormFrame';

export function AddFurnitureForm({ project, onBack, onSaved }: LogFormProps) {
  const { run, pending, error } = useAction();
  const form = useForm<AddFurnitureFormValues>({
    resolver: zodResolver(AddFurnitureSchema, undefined, { raw: true }),
    defaultValues: {
      name: '',
      vendor: '',
      retail: '',
      trade: '',
      link: '',
      tags: '',
      notes: '',
    },
  });

  return (
    <FormProvider {...form}>
      <LogFormFrame
        title="Log furniture"
        intro="Track a furniture purchase for"
        project={project}
        onBack={onBack}
        onSubmit={form.handleSubmit((values) =>
          run(() => addFurniture(project.id, values), onSaved)
        )}
        saveLabel="Save furniture"
        pending={pending}
        error={error}
      >
        <FurnitureFields />
      </LogFormFrame>
    </FormProvider>
  );
}
