'use client';

import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Project } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/form-field';
import { useCreateProject } from '@/lib/query/projects';

const schema = z.object({
  client: z.string().min(1, 'Client name is required'),
  project: z.string().min(1, 'Project name is required'),
  address: z.string().optional(),
  hourlyRate: z
    .string()
    .min(1, 'Hourly rate is required')
    .refine((val) => Number(val) > 0, 'Hourly rate must be greater than zero'),
});

interface ProjectOnboardProps {
  onBack: () => void;
}

export function ProjectOnboard({ onBack }: ProjectOnboardProps) {
  const [created, setCreated] = useState(false);
  const [newProject, setNewProject] = useState<Project | null>(null);

  const createProject = useCreateProject();

  type FormValues = z.infer<typeof schema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      client: '',
      project: '',
      address: '',
      hourlyRate: '150',
    } as FormValues,
  });

  const onSubmit = (data: z.infer<typeof schema>) => {
    createProject.mutate(
      {
        client: data.client,
        project: data.project,
        address: data.address ?? '',
        hourlyRate: Number(data.hourlyRate),
      },
      {
        onSuccess: (createdProject) => {
          setNewProject(createdProject);
          setCreated(true);
        },
      }
    );
  };

  if (created && newProject) {
    return (
      <div className="mx-auto max-w-4xl animate-in fade-in zoom-in duration-300">
        <Button
          type="button"
          variant="link"
          size="sm"
          onClick={onBack}
          className="mb-8 h-auto px-0"
        >
          <ArrowLeft className="size-3.5" /> Back to home
        </Button>
        <h1 className="mt-6 font-serif text-4xl">Project created</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {newProject.client} – {newProject.project} is ready.
        </p>
        <div className="mt-8 flex gap-3">
          <Button onClick={onBack} className="w-full">
            Back to home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Button
        type="button"
        variant="link"
        size="sm"
        onClick={onBack}
        className="mb-8 h-auto px-0"
      >
        <ArrowLeft className="size-3.5" /> Back to home
      </Button>
      <h1 className="mt-6 font-serif text-4xl">New project</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Get started with a new client project.
      </p>
      <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Client name"
            {...form.register('client')}
            error={form.formState.errors.client}
          />
          <TextField
            label="Project name"
            {...form.register('project')}
            error={form.formState.errors.project}
          />
        </div>
        <TextField
          label="Address"
          {...form.register('address')}
          error={form.formState.errors.address}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Hourly rate"
            type="number"
            prefix="$"
            {...form.register('hourlyRate')}
            error={form.formState.errors.hourlyRate}
          />
        </div>
        <Button
          type="submit"
          className="mt-6 w-full"
          disabled={form.formState.isSubmitting || createProject.isPending}
        >
          Create project
        </Button>
      </form>
    </div>
  );
}
