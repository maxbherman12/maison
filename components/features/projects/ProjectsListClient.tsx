'use client';

import { useState } from 'react';
import { useProjects } from '@/lib/query/projects';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { ProjectList } from './ProjectList';
import { ProjectOnboard } from './ProjectOnboard';

export function ProjectsListClient() {
  const { data, isLoading, error } = useProjects();
  const [onboarding, setOnboarding] = useState(false);

  return (
    <AppShell
      header={
        <AppHeader
          brand
          actions={
            <Button type="button" onClick={() => setOnboarding(true)}>
              New project
            </Button>
          }
        />
      }
    >
      {onboarding ? (
        <ProjectOnboard onBack={() => setOnboarding(false)} />
      ) : isLoading ? (
        <div className="mx-auto max-w-4xl py-10 flex items-center justify-center">
          <p className="text-muted-foreground">Loading projects...</p>
        </div>
      ) : error ? (
        <div className="mx-auto max-w-4xl py-10 text-center">
          <p className="text-destructive">Unable to load projects.</p>
        </div>
      ) : (
        <ProjectList projects={data ?? []} />
      )}
    </AppShell>
  );
}
