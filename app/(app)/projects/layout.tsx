import type { ReactNode } from 'react';
import { ClientList } from '@/components/features/projects/ClientList';
import { AppShell } from '@/components/layout/AppShell';
import { getServices } from '@/lib/services';

/** The desktop client sidebar beside whichever project page is open. */
export default async function ProjectsLayout({ children }: { children: ReactNode }) {
  const { projects } = await getServices();

  return (
    <AppShell fill>
      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)] md:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="hidden min-h-0 flex-col border-r border-border md:flex">
          <ClientList projects={await projects.list()} />
        </aside>
        <div className="flex min-h-0 min-w-0 flex-col">{children}</div>
      </div>
    </AppShell>
  );
}
