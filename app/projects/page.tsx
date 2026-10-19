import { ProjectsListClient } from '@/components/features/projects/ProjectsListClient';
import Link from 'next/link';

export default function ProjectsPage() {
  return (
    <div className="min-h-screen bg-[#f7f6f2] text-[#292923]">
      <header className="border-b border-[#deddd5] px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
        <div className="mx-auto max-w-[1380px]">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="font-serif text-2xl tracking-tight hover:text-[#bd765b] transition-colors"
            >
              Maison
            </Link>
            <Link
              href="/projects"
              className="rounded-full bg-[#bd765b] px-5 py-2.5 text-sm text-white font-medium hover:bg-[#a9573d] transition-colors"
            >
              New project
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1380px] px-4 sm:px-6 lg:px-8 py-8">
        <ProjectsListClient />
      </main>
    </div>
  );
}
