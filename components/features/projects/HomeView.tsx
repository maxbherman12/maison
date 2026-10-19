'use client';

import { Plus } from 'lucide-react';
import type { Project } from '@/lib/types';
import { Button } from '@/components/ui/button';

interface HomeViewProps {
  projects: Project[];
  open: (id: string) => void;
  newProject: () => void;
}

export function HomeView({ projects, open, newProject }: HomeViewProps) {
  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[#9b9b91]">
            Wednesday, September 24
          </p>
          <h1 className="mt-1 font-serif text-4xl sm:text-5xl">Your projects</h1>
          <p className="mt-2 text-sm text-[#85857a]">
            A little more calm in your day.
          </p>
        </div>
        <Button
          onClick={newProject}
          className="w-full rounded-full bg-[#bd765b] text-white sm:w-auto"
        >
          <Plus data-icon="inline-start" /> New project
        </Button>
      </div>

      <h2 className="mb-3 font-serif text-2xl">All projects</h2>
      <div className="flex flex-col gap-3">
        {projects.map((item) => (
          <button
            key={item.id}
            onClick={() => open(item.id)}
            className="flex w-full items-center gap-3 rounded-2xl border border-[#deddd5] bg-[#fbfaf7] p-3 text-left sm:p-5 hover:bg-[#f1e6df] transition-colors"
          >
            <div className="flex min-w-0 items-center gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#dbe1d4] text-sm text-[#5b6753]">
                {item.initials}
              </span>
              <span className="min-w-0">
                <strong className="block truncate font-serif text-xl font-normal">
                  {item.client}
                </strong>
                <span className="block truncate text-sm text-[#85857a]">
                  {item.project}
                </span>
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
