import Link from 'next/link';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppShell } from '@/components/layout/AppShell';
import { ProjectsListClient } from '@/components/features/projects/ProjectsListClient';

export default function ProjectsPage() {
  return (
    <AppShell
      header={
        <AppHeader
          brand
          actions={
            <Link
              href="/projects"
              className="rounded-full bg-[#bd765b] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#a9573d]"
            >
              New project
            </Link>
          }
        />
      }
    >
      <ProjectsListClient />
    </AppShell>
  );
}
