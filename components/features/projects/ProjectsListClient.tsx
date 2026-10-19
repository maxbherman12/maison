'use client';

import { useState } from 'react';
import { useProjects } from '@/lib/query/projects';
import { ProjectList } from './ProjectList';
import { ProjectOnboard } from './ProjectOnboard';

export function ProjectsListClient() {
  const { data, isLoading, error } = useProjects();
  const [onboarding, setOnboarding] = useState(false);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl py-10 flex items-center justify-center">
        <p className="text-muted-foreground">Loading projects...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl py-10 text-center">
        <p className="text-destructive">Unable to load projects.</p>
      </div>
    );
  }

  if (onboarding) {
    return <ProjectOnboard onBack={() => setOnboarding(false)} />;
  }

  return (
    <div className="mx-auto max-w-[1380px] px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-serif tracking-tight">Your projects</h1>
          <p className="text-sm text-muted-foreground">
            Manage clients, log hours, track furniture, and send invoices.
          </p>
        </div>
        <button
          onClick={() => setOnboarding(true)}
          className="rounded-full bg-[#bd765b] px-6 py-3 text-white font-medium hover:bg-[#a9573d] transition-colors"
        >
          New project
        </button>
      </div>

      <ProjectList projects={data ?? []} />
    </div>
  );
}
