'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { FormProvider, useForm } from 'react-hook-form';
import { updateProject } from '@/lib/actions/projects';
import { useAction } from '@/lib/actions/use-action';
import { centsToInput } from '@/lib/domain/money';
import type { Project } from '@/lib/domain/types';
import {
  ProjectSchema,
  type ProjectFormValues,
} from '@/lib/validators/projects';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ProjectFields } from './ProjectFields';

export function ProjectEditForm({
  project,
  onClose,
}: {
  project: Project;
  onClose: () => void;
}) {
  const { run, pending, error } = useAction();
  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(ProjectSchema, undefined, { raw: true }),
    defaultValues: {
      client: project.client,
      name: project.name,
      address: project.address,
      hourlyRate: centsToInput(project.hourlyRateCents),
    },
  });

  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit((values) =>
          run(() => updateProject(project.id, values), onClose)
        )}
        className="rounded-2xl border border-border bg-secondary p-5"
      >
        <ProjectFields />
        {error && <Alert className="mt-4">{error}</Alert>}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button type="submit" disabled={pending} className="w-full sm:w-auto">
            {pending ? 'Saving…' : 'Save details'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={pending}
          >
            Cancel
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
