'use client';

import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { createProject, updateProject } from '@/lib/actions/projects';
import { useAction } from '@/lib/actions/use-action';
import { centsToInput } from '@/lib/domain/money';
import {
  PAINTS,
  PAINT_NAMES,
  paintStyle,
  type Paint,
} from '@/lib/domain/paints';
import type { Project } from '@/lib/domain/types';
import {
  ProjectSchema,
  type ProjectFormValues,
} from '@/lib/validators/projects';
import { FlowBack, FlowBody, FlowFooter } from '@/components/layout/FlowPanel';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/form-field';

/** Creates a project, or edits `project` when given one. */
export function ProjectForm({
  project,
  initialPaint = 'verdigris',
  closeHref,
}: {
  project?: Project;
  initialPaint?: Paint;
  closeHref: string;
}) {
  const router = useRouter();
  const { run, pending, error } = useAction();
  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(ProjectSchema, undefined, { raw: true }),
    defaultValues: {
      client: project?.client ?? '',
      name: project?.name ?? '',
      address: project?.address ?? '',
      hourlyRate: project ? centsToInput(project.hourlyRateCents) : '',
      paint: project?.paint ?? initialPaint,
    },
  });
  const { register, formState: { errors } } = form;

  const paint = form.watch('paint');
  const client = form.watch('client').trim();

  const save = form.handleSubmit((values) =>
    project
      ? run(() => updateProject(project.id, values), () => router.push(closeHref))
      : run(
          () => createProject(values),
          ({ id }) => router.push(`/projects/${id}`)
        )
  );

  return (
    <form
      onSubmit={save}
      style={paintStyle(paint)}
      className="flex min-h-0 flex-1 flex-col"
    >
      <FlowBody className="pt-0 md:pt-0">
        <div className="-mx-6 mb-3 bg-primary px-6 pt-2 pb-3.5 text-primary-foreground transition-colors duration-300">
          <FlowBack href={closeHref} label={project ? 'Back' : 'Cancel'} />
          <h2 className="truncate pt-2 font-serif text-name font-normal">
            {client || 'New project'}
          </h2>
          <p className="text-label opacity-85">{PAINTS[paint].label}</p>
        </div>

        <div className="grid gap-2.5">
          <TextField label="Client name" {...register('client')} error={errors.client} />
          <TextField label="Project" {...register('name')} error={errors.name} />
          <div className="grid grid-cols-2 gap-4">
            <TextField
              label="Address"
              placeholder="Optional"
              {...register('address')}
              error={errors.address}
            />
            <TextField
              label="Hourly rate"
              type="number"
              step="0.01"
              inputMode="decimal"
              prefix="$"
              {...register('hourlyRate')}
              error={errors.hourlyRate}
            />
          </div>

          <fieldset>
            <legend className="text-label text-muted-foreground">Wall color</legend>
            <div className="mt-3 grid grid-cols-8 gap-1">
              {PAINT_NAMES.map((name) => (
                <label
                  key={name}
                  title={PAINTS[name].label}
                  style={{ background: PAINTS[name].color }}
                  className="h-11 cursor-pointer transition-transform duration-200 ease-gallery has-checked:-translate-y-1.5 has-checked:shadow-[0_5px_0_-3px_var(--foreground)] has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-foreground"
                >
                  <input
                    type="radio"
                    value={name}
                    aria-label={PAINTS[name].label}
                    className="sr-only"
                    {...register('paint')}
                  />
                </label>
              ))}
            </div>
          </fieldset>

          {error && <Alert>{error}</Alert>}
        </div>
      </FlowBody>

      <FlowFooter>
        <Button type="submit" size="xl" disabled={pending}>
          {pending ? 'Saving…' : project ? 'Save changes' : 'Create project'}
        </Button>
      </FlowFooter>
    </form>
  );
}
