'use client';

import type { Project } from '@/lib/types';
import { formatMoney } from '@/lib/types';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProjectListProps {
  projects: Project[];
  onNewProject: () => void;
}

export function ProjectList({ projects, onNewProject }: ProjectListProps) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-serif text-2xl">All projects</h2>
        <Button type="button" onClick={onNewProject}>
          <Plus aria-hidden="true" />
          New project
        </Button>
      </div>
      <div className="flex flex-col gap-3">
        {projects.map((item) => (
          <a
            key={item.id}
            href={`/projects/${item.id}`}
            className="flex w-full items-center gap-3 rounded-2xl border border-border bg-secondary p-3 text-left transition-colors hover:bg-accent sm:p-5"
          >
            <div className="flex min-w-0 items-center gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-tone-success-bg text-sm text-tone-success-fg">
                {item.initials}
              </span>
              <span className="min-w-0">
                <strong className="block truncate font-serif text-xl font-normal">
                  {item.client}
                </strong>
                <span className="block truncate text-sm text-muted-foreground">
                  {item.project}
                </span>
              </span>
            </div>
            <span className="shrink-0 text-sm font-medium">{formatMoney(item.outstanding)}</span>
          </a>
        ))}
        {projects.length === 0 && (
          <div className="p-8 text-center">
            <p className="text-sm text-muted-foreground">No projects yet. Create your first project to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}
