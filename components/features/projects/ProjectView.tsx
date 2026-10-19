'use client';

import { useState } from 'react';
import type { Project } from '@/lib/types';
import { ProjectDetail } from './ProjectDetail';
import { ProjectOnboard } from './ProjectOnboard';

type View = 'detail' | 'onboard';

interface ProjectViewProps {
  project: Project;
}

export function ProjectView({ project }: ProjectViewProps) {
  const [view, setView] = useState<View>('detail');

  return (
    <div className="min-h-screen bg-[#f7f6f2] text-[#292923]">
      <div className="mx-auto min-h-screen max-w-[1380px]">
        <div className="px-4 py-4 pb-8 sm:px-6 sm:py-7 lg:px-8 lg:py-10">
          {view === 'detail' && <ProjectDetail project={project} />}
          {view === 'onboard' && <ProjectOnboard onBack={() => setView('detail')} />}
        </div>
      </div>
    </div>
  );
}
