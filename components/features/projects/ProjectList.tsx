import Link from 'next/link';
import { Plus } from 'lucide-react';
import { formatMoneyWhole } from '@/lib/domain/money';
import { clientInitials, type ProjectListItem } from '@/lib/domain/types';
import { buttonVariants } from '@/components/ui/button';

export function ProjectList({ projects }: { projects: ProjectListItem[] }) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h1 className="font-serif text-2xl">All projects</h1>
        <Link href="/projects/new" className={buttonVariants()}>
          <Plus aria-hidden="true" />
          New project
        </Link>
      </div>

      {projects.length === 0 ? (
        <p className="p-8 text-center text-sm text-muted-foreground">
          No projects yet. Create your first project to get started.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border bg-secondary p-3 text-left transition-colors hover:bg-accent sm:p-5"
            >
              <div className="flex min-w-0 items-center gap-4">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-tone-success-bg text-sm text-tone-success-fg">
                  {clientInitials(project.client)}
                </span>
                <span className="min-w-0">
                  <strong className="block truncate font-serif text-xl font-normal">
                    {project.client}
                  </strong>
                  <span className="block truncate text-sm text-muted-foreground">
                    {project.name}
                  </span>
                </span>
              </div>
              <span className="shrink-0 text-sm font-medium">
                {formatMoneyWhole(project.outstandingCents)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
