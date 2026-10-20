import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { projectService } from '@/lib/services/container';
import type { Project } from '@/lib/types';
import { FurnitureBoard } from '@/components/features/furniture/FurnitureBoard';

export default async function FurnitureBoardPage({
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
          <div className="flex items-center justify-between gap-3">
            <Link
              href={`/projects/${project.id}`}
              className="inline-flex items-center gap-1.5 text-sm text-[#bd765b] transition-colors hover:underline"
            >
              <ArrowLeft className="size-3.5" /> Back to project
            </Link>
            <span className="truncate text-sm text-[#99998e]">
              {project.client} — {project.project}
            </span>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1380px] px-4 py-8 sm:px-6 lg:px-8">
        <FurnitureBoard project={project} />
      </main>
    </div>
  );
}
