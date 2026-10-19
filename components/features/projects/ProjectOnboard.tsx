'use client';

import { useState } from 'react';
import { ArrowLeft, Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Project } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { projectService } from '@/lib/services/container';
import type { FieldError } from 'react-hook-form';

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
    projectService
      .createProject({
        client: data.client,
        project: data.project,
        address: data.address ?? '',
        hourlyRate: Number(data.hourlyRate),
      })
      .then((createdProject) => {
        setNewProject(createdProject);
        setCreated(true);
      });
  };

  if (created && newProject) {
    return (
      <div className="mx-auto max-w-2xl animate-in fade-in zoom-in duration-300">
        <div className="flex items-center gap-2 mb-8">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-sm text-[#bd765b] hover:underline"
            aria-label="Back to home"
          >
            <ArrowLeft className="size-3.5" /> Back to home
          </button>
        </div>
        <h1 className="mt-6 font-serif text-4xl">Project created</h1>
        <p className="mt-2 text-sm text-[#85857a]">
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
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center gap-2 mb-8">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm text-[#bd765b] hover:underline"
          aria-label="Back to home"
        >
          <ArrowLeft className="size-3.5" /> Back to home
        </button>
      </div>
      <h1 className="mt-6 font-serif text-4xl">New project</h1>
      <p className="mt-2 text-sm text-[#85857a]">
        Get started with a new client project.
      </p>
      <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Client name"
            {...form.register('client')}
            error={form.formState.errors.client}
          />
          <FormField
            label="Project name"
            {...form.register('project')}
            error={form.formState.errors.project}
          />
        </div>
        <FormField label="Address" {...form.register('address')} error={form.formState.errors.address} />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Hourly rate"
            type="number"
            prefix="$"
            {...form.register('hourlyRate')}
            error={form.formState.errors.hourlyRate}
          />
        </div>
        <Button
          type="submit"
          className="mt-6 w-full rounded-xl bg-[#bd765b] text-white"
          disabled={form.formState.isSubmitting}
        >
          Create project
        </Button>
      </form>
    </div>
  );
}

function FormField({
  label,
  type = 'text',
  prefix,
  error,
  ...props
}: {
  label: string;
  type?: string;
  prefix?: string;
  error?: FieldError | undefined;
  [key: string]: unknown;
}) {
  return (
    <div className="space-y-1">
      <span className="text-xs uppercase tracking-[0.1em] text-[#85857a]">{label}</span>
      <div className="flex items-center rounded-xl border border-[#deddd5] bg-[#fffefa] focus-within:border-[#bd765b]">
        {prefix && <span className="text-sm text-[#99998e] px-3">{prefix}</span>}
        <input
          type={type}
          className="h-11 w-full bg-transparent px-1 text-sm outline-none"
          {...(props as Record<string, unknown>)}
        />
      </div>
      {error && <p className="text-xs text-destructive">{error.message}</p>}
    </div>
  );
}
