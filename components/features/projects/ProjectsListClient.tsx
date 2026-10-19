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
    <main className="mx-auto max-w-[1380px] px-4 sm:px-6 lg:px-8 py-8">
      <ProjectList projects={data ?? []} />
    </main>
  );
}
