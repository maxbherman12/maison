'use client';

import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormProvider, useForm } from 'react-hook-form';
import { createProject } from '@/lib/actions/projects';
import { useAction } from '@/lib/actions/use-action';
import {
  ProjectSchema,
  type ProjectFormValues,
} from '@/lib/validators/projects';
import { BackLink } from '@/components/layout/BackLink';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ProjectFields } from './ProjectFields';

export function NewProjectForm() {
  const router = useRouter();
  const { run, pending, error } = useAction();
  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(ProjectSchema, undefined, { raw: true }),
    defaultValues: { client: '', name: '', address: '', hourlyRate: '150' },
  });

  return (
    <div className="mx-auto max-w-4xl">
      <BackLink href="/projects" label="All projects" />
      <h1 className="mt-6 font-serif text-4xl">New project</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Get started with a new client project.
      </p>

      <FormProvider {...form}>
        <form
          onSubmit={form.handleSubmit((values) =>
            run(
              () => createProject(values),
              ({ id }) => router.push(`/projects/${id}`)
            )
          )}
          className="mt-8 space-y-4"
        >
          <ProjectFields />
          {error && <Alert>{error}</Alert>}
          <Button type="submit" className="mt-6 w-full" disabled={pending}>
            {pending ? 'Creating…' : 'Create project'}
          </Button>
        </form>
      </FormProvider>
    </div>
  );
}
