'use client';

import type { Project } from '@/lib/types';
import { formatMoney } from '@/lib/types';

interface ProjectListProps {
  projects: Project[];
}

export function ProjectList({ projects }: ProjectListProps) {
  return (
    <div>
      <h2 className="mb-3 font-serif text-2xl">All projects</h2>
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
