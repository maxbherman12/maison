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
    <>
      {view === 'detail' && <ProjectDetail project={project} />}
      {view === 'onboard' && <ProjectOnboard onBack={() => setView('detail')} />}
    </>
  );
}
