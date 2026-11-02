'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useProjects } from '@/lib/query/projects';
import { ProjectList } from './ProjectList';
import { ProjectOnboard } from './ProjectOnboard';

export function ProjectsListClient() {
  const { data, isLoading, error } = useProjects();
  const [onboarding, setOnboarding] = useState(false);

  return (
    <div className="min-h-screen bg-[#f7f6f2] text-[#292923]">
      <header className="border-b border-[#deddd5] px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
        <div className="mx-auto max-w-[1380px]">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="font-serif text-2xl tracking-tight hover:text-[#bd765b] transition-colors"
            >
              Maison
            </Link>
            <button
              type="button"
              onClick={() => setOnboarding(true)}
              className="rounded-full bg-[#bd765b] px-5 py-2.5 text-sm text-white font-medium hover:bg-[#a9573d] transition-colors"
            >
              New project
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1380px] px-4 sm:px-6 lg:px-8 py-8">
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
      </main>
    </div>
  );
}
