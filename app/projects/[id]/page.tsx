import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { projectService } from '@/lib/services/container';
import type { Project } from '@/lib/types';
import { ProjectClient } from '@/components/features/projects/ProjectClient';

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project: Project | null = await projectService.getProject(id);

  if (!project) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[#f7f6f2] text-[#292923]">
      <header className="border-b border-[#deddd5] px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
        <div className="mx-auto max-w-[1380px]">
          <div className="flex items-center gap-3">
            <Link
              href="/projects"
              className="inline-flex items-center gap-1.5 text-sm text-[#bd765b] hover:underline transition-colors"
            >
              <ArrowLeft className="size-3.5" /> All projects
            </Link>
            <h1 className="font-serif text-2xl tracking-tight">{project.project}</h1>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1380px] px-4 sm:px-6 lg:px-8 py-8">
        <ProjectClient project={project} />
      </main>
    </div>
  );
}
