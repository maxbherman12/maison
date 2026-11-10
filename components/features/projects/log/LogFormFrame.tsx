'use client';

import type { FormEventHandler, ReactNode } from 'react';
import type { Project } from '@/lib/domain/types';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export interface LogFormProps {
  project: Project;
  onBack: () => void;
  onSaved: () => void;
}

/** The heading, error, and footer every "log something" form shares. */
export function LogFormFrame({
  title,
  intro,
  project,
  onBack,
  onSubmit,
  saveLabel,
  pending,
  error,
  children,
}: {
  title: string;
  intro: string;
  project: Project;
  onBack: () => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
  saveLabel: string;
  pending: boolean;
  error: string | null;
  children: ReactNode;
}) {
  return (
    <div className="animate-in fade-in slide-in-from-right-3 duration-300">
      <h1 className="mt-6 font-serif text-4xl">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {intro} <strong>{project.name}</strong>
      </p>
      <form onSubmit={onSubmit} className="mt-10 space-y-4">
        {children}
        {error && <Alert>{error}</Alert>}
        <div className="mt-6 flex items-center justify-between">
          <Button type="button" variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? 'Saving…' : saveLabel}
          </Button>
        </div>
      </form>
    </div>
  );
}
