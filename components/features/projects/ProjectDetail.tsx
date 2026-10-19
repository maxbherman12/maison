'use client';

import { useState } from 'react';
import type { Project } from '@/lib/types';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProjectHeader } from './ProjectHeader';
import { ProjectSummary } from './ProjectSummary';
import { ProjectLog } from './ProjectLog';
import { ProjectStatus } from './ProjectStatus';
import { ProjectInvoice } from './ProjectInvoice';
import { ProjectOnboard } from './ProjectOnboard';

type View = 'summary' | 'log' | 'status' | 'invoice';

interface ProjectDetailProps {
  project: Project;
}

export function ProjectDetail({ project }: ProjectDetailProps) {
  const [view, setView] = useState<View>('summary');

  return (
    <div className="min-h-screen bg-[#f7f6f2] text-[#292923]">
      <div className="mx-auto min-h-screen max-w-[1380px]">
        <ProjectHeader onHome={() => setView('summary')} />

        <div className="px-4 py-4 pb-8 sm:px-8 sm:py-7 lg:px-12 lg:py-10">
          {view === 'summary' && <ProjectSummary project={project} onLog={() => setView('log')} onStatus={() => setView('status')} onInvoice={() => setView('invoice')} />}
          {view === 'log' && <ProjectLog project={project} onBack={() => setView('summary')} />}
          {view === 'status' && <ProjectStatus project={project} onBack={() => setView('summary')} />}
          {view === 'invoice' && <ProjectInvoice project={project} onBack={() => setView('summary')} />}
        </div>
      </div>
    </div>
  );
}
