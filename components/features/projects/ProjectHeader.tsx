'use client';

import { ArrowLeft } from 'lucide-react';

interface ProjectHeaderProps {
  onHome: () => void;
}

export function ProjectHeader({ onHome }: ProjectHeaderProps) {
  return (
    <header className="border-b border-[#deddd5] px-4 py-3 sm:px-8 sm:py-5 lg:px-12">
      <button
        onClick={onHome}
        className="inline-flex items-center gap-1.5 font-serif text-xl tracking-tight sm:text-2xl hover:text-[#bd765b] transition-colors"
        aria-label="Back to all projects"
      >
        <ArrowLeft className="size-3.5" />
        Maison
      </button>
    </header>
  );
}
