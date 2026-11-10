'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, CreditCard, Package, Timer } from 'lucide-react';
import type { Project } from '@/lib/domain/types';
import { cn } from '@/lib/utils';
import { BackLink } from '@/components/layout/BackLink';
import { Button, buttonVariants } from '@/components/ui/button';
import { AddFurnitureForm } from './AddFurnitureForm';
import { CustomChargeForm } from './CustomChargeForm';
import { LogHoursForm } from './LogHoursForm';

type LogType = 'hours' | 'furniture' | 'custom';
type Step = 'type' | 'details' | 'done';

const STEPS: { id: Step; label: string }[] = [
  { id: 'type', label: 'Type' },
  { id: 'details', label: 'Details' },
  { id: 'done', label: 'Done' },
];

const LOG_TYPES: {
  type: LogType;
  icon: ReactNode;
  title: string;
  text: string;
}[] = [
  {
    type: 'hours',
    icon: <Timer className="size-5 text-primary" />,
    title: 'Hours',
    text: 'Time spent on this project',
  },
  {
    type: 'furniture',
    icon: <Package className="size-5 text-primary" />,
    title: 'Furniture',
    text: 'Purchases and trade pricing',
  },
  {
    type: 'custom',
    icon: <CreditCard className="size-5 text-primary" />,
    title: 'Custom charge',
    text: 'One-time expense',
  },
];

const FORMS = {
  hours: LogHoursForm,
  furniture: AddFurnitureForm,
  custom: CustomChargeForm,
};

export function ProjectLog({ project }: { project: Project }) {
  const [type, setType] = useState<LogType | null>(null);
  const [step, setStep] = useState<Step>('type');
  const stepIndex = STEPS.findIndex((item) => item.id === step);
  const Form = type && FORMS[type];

  return (
    <div className="mx-auto max-w-4xl">
      <BackLink href={`/projects/${project.id}`} label={project.name} />

      <ol className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2">
        {STEPS.map((item, index) => (
          <li key={item.id} className="flex items-center gap-2">
            <span
              className={cn(
                'flex size-7 items-center justify-center rounded-full text-xs font-medium',
                index <= stepIndex
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {index < stepIndex ? <Check className="size-3.5" /> : index + 1}
            </span>
            <span
              className={cn(
                'text-xs',
                index === stepIndex
                  ? 'font-medium text-foreground'
                  : 'text-muted-foreground'
              )}
            >
              {item.label}
            </span>
          </li>
        ))}
      </ol>

      {step === 'type' && (
        <>
          <h1 className="mt-6 font-serif text-4xl">What would you like to log?</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Tap an option to add it to <strong>{project.name}</strong>.
          </p>
          <div className="mt-7 grid gap-3">
            {LOG_TYPES.map((option) => (
              <button
                key={option.type}
                type="button"
                onClick={() => {
                  setType(option.type);
                  setStep('details');
                }}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-secondary p-5 text-left transition-colors hover:bg-accent"
              >
                <span className="flex items-center gap-3">
                  {option.icon}
                  <span>
                    <span className="block font-serif text-xl">{option.title}</span>
                    <span className="block text-sm text-muted-foreground">
                      {option.text}
                    </span>
                  </span>
                </span>
                <ArrowRight className="size-5 shrink-0 text-muted-foreground" />
              </button>
            ))}
          </div>
        </>
      )}

      {step === 'details' && Form && (
        <Form
          project={project}
          onBack={() => setStep('type')}
          onSaved={() => setStep('done')}
        />
      )}

      {step === 'done' && (
        <div className="animate-in fade-in slide-in-from-right-3 duration-300">
          <h1 className="mt-6 font-serif text-4xl">Saved</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The entry has been added to <strong>{project.name}</strong>.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => setStep('type')}
              className="w-full sm:w-auto"
            >
              Log another
            </Button>
            <Link
              href={`/projects/${project.id}`}
              className={cn(buttonVariants(), 'w-full sm:w-auto')}
            >
              Back to project
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
