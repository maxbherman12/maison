import type { ReactNode } from 'react';
import type { Project } from '@/lib/types';
import { AppHeader } from './AppHeader';
import { AppShell } from './AppShell';

type ProjectContext = Pick<Project, 'id' | 'client' | 'project'>;

interface ProjectShellProps {
  project: ProjectContext;
  children: ReactNode;
  backHref?: string;
  backLabel?: string;
  title?: string;
  /** Right-aligned context. Defaults to "Client — Project" when there is no title. */
  context?: string;
  actions?: ReactNode;
  contentClassName?: string;
}

export function ProjectShell({
  project,
  children,
  backHref,
  backLabel = 'Back to project',
  title,
  context,
  actions,
  contentClassName,
}: ProjectShellProps) {
  const resolvedContext =
    context ?? (title ? undefined : `${project.client} — ${project.project}`);

  return (
    <AppShell
      contentClassName={contentClassName}
      header={
        <AppHeader
          back={{
            href: backHref ?? `/projects/${project.id}`,
            label: backLabel,
          }}
          title={title}
          context={resolvedContext}
          actions={actions}
        />
      }
    >
      {children}
    </AppShell>
  );
}
