'use client';

import { useState } from 'react';
import { ArrowLeft, Timer, Package, CreditCard, Check, X } from 'lucide-react';
import type { Project } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { formatMoney } from '@/lib/types';
import {
  useLogHours,
  useAddFurniture,
} from '@/lib/query/projects';
import { LogHoursForm } from './forms/LogHoursForm';
import { AddFurnitureForm } from './forms/AddFurnitureForm';
import { CustomChargeForm } from './forms/CustomChargeForm';

type LogType = 'hours' | 'furniture' | 'custom';

interface ProjectLogProps {
  project: Project;
  onBack: () => void;
}

export function ProjectLog({ project, onBack }: ProjectLogProps) {
  const [type, setType] = useState<LogType>('hours');
  const [step, setStep] = useState(1);
  const [generated, setGenerated] = useState(false);

  const logHours = useLogHours();
  const addFurniture = useAddFurniture();

  const handleSave = (data: { title: string; amount: number; date: string }) => {
    if (type === 'hours' || type === 'custom') {
      logHours.mutate({
        projectId: project.id,
        input: {
          title: data.title,
          date: data.date,
          hours: data.amount,
        },
      });
    } else {
      addFurniture.mutate({
        projectId: project.id,
        input: {
          name: data.title,
          vendor: '',
          retail: data.amount,
          trade: data.amount,
          link: '',
          tags: [],
          notes: '',
        },
      });
    }
    setGenerated(true);
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center gap-2 mb-8">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm text-[#bd765b] hover:underline"
          aria-label="Back to project"
        >
          <ArrowLeft className="size-3.5" /> Back to {project.project}
        </button>
      </div>

      <div className="flex items-center gap-2 text-xs text-[#99998e] mb-8">
        {[1, 2, 3].map((item) => (
          <span
            key={item}
            className={`flex size-7 items-center justify-center rounded-full ${
              item <= step ? 'bg-[#bd765b] text-white' : 'bg-[#e8e5dc]'
            }`}
          >
            {item}
          </span>
        ))}
      </div>

      {step === 1 && (
        <>
          <h1 className="mt-6 font-serif text-4xl">What would you like to log?</h1>
          <div className="mt-7 grid gap-3">
            <LogTypeCard
              id="hours"
              icon={<Timer className="size-5 text-[#bd765b]" />}
              title="Hours"
              text="Time spent on this project"
              active={type === 'hours'}
              onSelect={() => setType('hours')}
            />
            <LogTypeCard
              id="furniture"
              icon={<Package className="size-5 text-[#bd765b]" />}
              title="Furniture"
              text="Purchases and trade pricing"
              active={type === 'furniture'}
              onSelect={() => setType('furniture')}
            />
            <LogTypeCard
              id="custom"
              icon={<CreditCard className="size-5 text-[#bd765b]" />}
              title="Custom charge"
              text="One-time expense"
              active={type === 'custom'}
              onSelect={() => setType('custom')}
            />
          </div>
          <div className="mt-8">
            <Button variant="outline" onClick={onBack} className="w-full">
              Back to project
            </Button>
          </div>
        </>
      )}

      {step === 2 && type === 'hours' && (
        <LogHoursForm
          project={project}
          onBack={() => setStep(1)}
          onNext={(data) => {
            logHours.mutate({
              projectId: project.id,
              input: { title: data.title, date: data.date, hours: data.hours },
            });
            setStep(3);
            setGenerated(true);
          }}
        />
      )}

      {step === 2 && type === 'furniture' && (
        <AddFurnitureForm
          project={project}
          onBack={() => setStep(1)}
          onNext={(input) => {
            addFurniture.mutate({
              projectId: project.id,
              input,
            });
            setStep(3);
            setGenerated(true);
          }}
        />
      )}

      {step === 2 && type === 'custom' && (
        <CustomChargeForm
          project={project}
          onBack={() => setStep(1)}
          onNext={(data) => {
            logHours.mutate({
              projectId: project.id,
              input: { title: data.title, date: data.date, hours: data.amount },
            });
            setStep(3);
            setGenerated(true);
          }}
        />
      )}

      {step === 3 && generated && (
        <div className="animate-in fade-in slide-in-from-right-3 duration-300">
          <h1 className="mt-6 font-serif text-4xl">Saved</h1>
          <p className="mt-2 text-sm text-[#85857a]">
            The entry has been added to your project.
          </p>
          <div className="mt-8 flex gap-3">
            <Button variant="outline" onClick={() => { setStep(1); setGenerated(false); }} className="w-full">
              Log another
            </Button>
            <Button onClick={onBack} className="w-full bg-[#bd765b] text-white">
              Back to project
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function LogTypeCard({
  id,
  icon,
  title,
  text,
  active,
  onSelect,
}: {
  id: string;
  icon: React.ReactNode;
  title: string;
  text: string;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`flex flex-col items-start justify-between gap-3 rounded-xl border p-5 text-left transition-colors ${
        active
          ? 'border-[#bd765b] bg-[#fbfaf7]'
          : 'border-[#deddd5] bg-[#fbfaf7] hover:bg-[#f1e6df]'
      }`}
    >
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <h2 className="font-serif text-xl">{title}</h2>
          <p className="text-sm text-[#85857a]">{text}</p>
        </div>
      </div>
      <Check className="size-5 text-[#bd765b] opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  );
}
