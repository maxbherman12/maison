'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { formatMoneyWhole } from '@/lib/domain/money';
import { PAINTS } from '@/lib/domain/paints';
import type { ProjectListItem } from '@/lib/domain/types';
import { cn } from '@/lib/utils';

/** Every client and what is left to invoice. The whole list on phones, a sidebar on desktop. */
export function ClientList({ projects }: { projects: ProjectListItem[] }) {
  const { id } = useParams<{ id?: string }>();
  const activeId = id ?? projects[0]?.id;

  return (
    <>
      <div className="flex shrink-0 items-center justify-between px-6 pt-1 md:px-5.5 md:pt-3">
        <h1 className="text-label font-normal text-muted-foreground">Clients</h1>
        <Link
          href="/projects/new"
          className="inline-flex min-h-11 items-center text-label underline underline-offset-3"
        >
          New project
        </Link>
      </div>

      {projects.length === 0 ? (
        <p className="px-6 py-8 text-muted-foreground md:px-5.5">
          No clients yet. Add your first project to get started.
        </p>
      ) : (
        <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 md:px-2.5">
          {projects.map((project, index) => (
            <li
              key={project.id}
              className="motion-safe:animate-rise"
              style={{ animationDelay: `${Math.min(index, 9) * 50}ms` }}
            >
              <Link
                href={`/projects/${project.id}`}
                aria-current={project.id === id ? 'page' : undefined}
                className={cn(
                  'flex min-h-[62px] items-center gap-3.5 py-1.5 transition-colors md:px-3 md:hover:bg-muted',
                  project.id === activeId && 'md:bg-muted'
                )}
              >
                <span
                  aria-hidden="true"
                  className="h-11 w-3.5 shrink-0"
                  style={{ background: PAINTS[project.paint].color }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-serif text-name">
                    {project.client}
                  </span>
                  <span className="block truncate text-label text-muted-foreground">
                    {project.name}
                  </span>
                </span>
                {project.outstandingCents > 0 ? (
                  <span className="shrink-0 text-right tabular-nums">
                    {formatMoneyWhole(project.outstandingCents)}
                    <span className="block text-label text-muted-foreground">
                      to invoice
                    </span>
                  </span>
                ) : (
                  <span className="shrink-0 text-label text-muted-foreground">
                    Settled
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
