'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Timer, Package, CreditCard, Check, ArrowRight } from 'lucide-react';
import type { Project, AddFurnitureInput } from '@/lib/types';
import { BackLink } from '@/components/layout/BackLink';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { useLogHours, useAddFurniture } from '@/lib/query/projects';
import { LogHoursForm } from './forms/LogHoursForm';
import { AddFurnitureForm } from './forms/AddFurnitureForm';
import { CustomChargeForm } from './forms/CustomChargeForm';

type LogType = 'hours' | 'furniture' | 'custom';

type Step = 1 | 2 | 3;

const STEPS = [
  { number: 1, label: 'Type' },
  { number: 2, label: 'Details' },
  { number: 3, label: 'Done' },
];

interface ProjectLogProps {
  project: Project;
}

export function ProjectLog({ project }: ProjectLogProps) {
  const router = useRouter();
  const [type, setType] = useState<LogType | null>(null);
  const [step, setStep] = useState<Step>(1);
  const [error, setError] = useState<string | null>(null);

  const logHours = useLogHours();
  const addFurniture = useAddFurniture();
  const isSaving = logHours.isPending || addFurniture.isPending;

  const backToProject = () => router.push(`/projects/${project.id}`);

  const selectType = (next: LogType) => {
    setType(next);
    setError(null);
    setStep(2);
  };

  const handleSuccess = () => {
    setError(null);
    setStep(3);
  };

  const handleError = (err: Error) => {
    setError(err.message);
  };

  const saveHours = (data: { title: string; hours: number; date: string }) => {
    logHours.mutate(
      {
        projectId: project.id,
        input: { title: data.title, date: data.date, hours: data.hours },
      },
      { onSuccess: handleSuccess, onError: handleError }
    );
  };

  const saveFurniture = (input: AddFurnitureInput) => {
    addFurniture.mutate(
      { projectId: project.id, input },
      { onSuccess: handleSuccess, onError: handleError }
    );
  };

  const saveCharge = (data: { title: string; amount: number; date: string }) => {
    logHours.mutate(
      {
        projectId: project.id,
        input: { title: data.title, date: data.date, hours: 0, amount: data.amount },
      },
      { onSuccess: handleSuccess, onError: handleError }
    );
  };

  const startOver = () => {
    setError(null);
    setStep(1);
  };

  return (
    <div className="mx-auto max-w-4xl">
      <BackLink href={`/projects/${project.id}`} label={project.project} />

      <ol className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2">
        {STEPS.map((stepItem) => {
          const isDone = stepItem.number < step;
          const isCurrent = stepItem.number === step;
          return (
            <li key={stepItem.number} className="flex items-center gap-2">
              <span
                className={`flex size-7 items-center justify-center rounded-full text-xs font-medium ${
                  isDone || isCurrent
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {isDone ? <Check className="size-3.5" /> : stepItem.number}
              </span>
              <span
                className={`text-xs ${
                  isCurrent
                    ? 'font-medium text-foreground'
                    : 'text-muted-foreground'
                }`}
              >
                {stepItem.label}
              </span>
            </li>
          );
        })}
      </ol>

      {error && <Alert className="mt-8">{error}</Alert>}

      {step === 1 && (
        <>
          <h1 className="mt-6 font-serif text-4xl">What would you like to log?</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Tap an option to add it to <strong>{project.project}</strong>.
          </p>
          <div className="mt-7 grid gap-3">
            <LogTypeCard
              icon={<Timer className="size-5 text-primary" />}
              title="Hours"
              text="Time spent on this project"
              active={type === 'hours'}
              onSelect={() => selectType('hours')}
            />
            <LogTypeCard
              icon={<Package className="size-5 text-primary" />}
              title="Furniture"
              text="Purchases and trade pricing"
              active={type === 'furniture'}
              onSelect={() => selectType('furniture')}
            />
            <LogTypeCard
              icon={<CreditCard className="size-5 text-primary" />}
              title="Custom charge"
              text="One-time expense"
              active={type === 'custom'}
              onSelect={() => selectType('custom')}
            />
          </div>
        </>
      )}

      {step === 2 && type === 'hours' && (
        <LogHoursForm
          project={project}
          isSaving={isSaving}
          onBack={() => setStep(1)}
          onNext={saveHours}
        />
      )}

      {step === 2 && type === 'furniture' && (
        <AddFurnitureForm
          project={project}
          isSaving={isSaving}
          onBack={() => setStep(1)}
          onNext={saveFurniture}
        />
      )}

      {step === 2 && type === 'custom' && (
        <CustomChargeForm
          project={project}
          isSaving={isSaving}
          onBack={() => setStep(1)}
          onNext={saveCharge}
        />
      )}

      {step === 3 && (
        <div className="animate-in fade-in slide-in-from-right-3 duration-300">
          <h1 className="mt-6 font-serif text-4xl">Saved</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The entry has been added to <strong>{project.project}</strong>.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button
              variant="outline"
              onClick={startOver}
              className="w-full sm:w-auto"
            >
              Log another
            </Button>
            <Button onClick={backToProject} className="w-full sm:w-auto">
              Back to project
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function LogTypeCard({
  icon,
  title,
  text,
  active,
  onSelect,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={`flex items-center justify-between gap-3 rounded-xl border p-5 text-left transition-colors ${
        active
          ? 'border-primary bg-secondary'
          : 'border-border bg-secondary hover:bg-accent'
      }`}
    >
      <span className="flex items-center gap-3">
        {icon}
        <span>
          <span className="block font-serif text-xl">{title}</span>
          <span className="block text-sm text-muted-foreground">{text}</span>
        </span>
      </span>
      {active ? (
        <Check className="size-5 shrink-0 text-primary" />
      ) : (
        <ArrowRight className="size-5 shrink-0 text-muted-foreground" />
      )}
    </button>
  );
}
