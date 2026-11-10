'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { deleteCharge } from '@/lib/actions/charges';
import { deleteFurniture } from '@/lib/actions/furniture';
import { useAction } from '@/lib/actions/use-action';
import { buildBillableItems, totalCents } from '@/lib/domain/billing';
import { todayLocal } from '@/lib/domain/dates';
import { formatMoneyWhole } from '@/lib/domain/money';
import type { ProjectDetail } from '@/lib/domain/types';
import { Confirmation } from '@/components/layout/Confirmation';
import { FlowBack, FlowBody } from '@/components/layout/FlowPanel';
import { Button, buttonVariants } from '@/components/ui/button';
import { LogChargeForm, LogFurnitureForm } from './LogForms';
import { HoursStep, TaskStep } from './LogHoursForm';

type LogType = 'hours' | 'furniture' | 'charge';
type Screen = 'type' | 'hours' | 'task' | 'furniture' | 'charge';

const PATHS: Record<LogType, Screen[]> = {
  hours: ['type', 'hours', 'task'],
  furniture: ['type', 'furniture'],
  charge: ['type', 'charge'],
};

const OPTIONS: { type: LogType; title: string; text: string }[] = [
  { type: 'hours', title: 'Time', text: 'Hours on this project' },
  { type: 'furniture', title: 'Furniture', text: 'A purchase, at trade price' },
  { type: 'charge', title: 'Other charge', text: 'A one-time expense' },
];

export interface SavedEntry {
  id: string;
  kind: 'charge' | 'furniture';
  amountCents: number;
  summary: string;
}

/** One question per screen: what is being logged, then only what that needs. */
export function ProjectLog({
  project,
  furnitureOnly,
}: {
  project: ProjectDetail;
  furnitureOnly: boolean;
}) {
  const closeHref = `/projects/${project.id}`;
  const firstStep = furnitureOnly ? 1 : 0;

  const [type, setType] = useState<LogType>(furnitureOnly ? 'furniture' : 'hours');
  const [step, setStep] = useState(firstStep);
  const [hours, setHours] = useState(2);
  const [date, setDate] = useState(todayLocal);
  const [saved, setSaved] = useState<SavedEntry | null>(null);

  if (saved) {
    return (
      <Saved
        project={project}
        saved={saved}
        onLogAnother={() => {
          setSaved(null);
          setStep(0);
        }}
      />
    );
  }

  const path = PATHS[type];
  const screen = path[step];
  const header = (
    <>
      <div className="flex items-center justify-between">
        {step === firstStep ? (
          <FlowBack href={closeHref} />
        ) : (
          <FlowBack onClick={() => setStep(step - 1)} />
        )}
        <span className="text-label text-muted-foreground">
          Step {step - firstStep + 1} of {path.length - firstStep}
        </span>
      </div>
      <div className="flex gap-1.5 pt-1" aria-hidden="true">
        {path.slice(firstStep).map((name, index) => (
          <i
            key={name}
            className={
              index <= step - firstStep ? 'h-0.5 flex-1 bg-primary' : 'h-0.5 flex-1 bg-border'
            }
          />
        ))}
      </div>
    </>
  );

  if (screen === 'type') {
    return (
      <FlowBody>
        {header}
        <h2 className="pt-3 pb-2.5 font-serif text-heading font-normal">
          What are you logging?
        </h2>
        {OPTIONS.map((option) => (
          <button
            key={option.type}
            type="button"
            onClick={() => {
              setType(option.type);
              setStep(1);
            }}
            className="flex items-baseline justify-between gap-3 py-3.5 text-left font-serif text-name"
          >
            {option.title}
            <small className="font-sans text-label text-muted-foreground">
              {option.text}
            </small>
          </button>
        ))}
      </FlowBody>
    );
  }

  const shared = { project, header, onSaved: setSaved };

  switch (screen) {
    case 'hours':
      return (
        <HoursStep
          {...shared}
          hours={hours}
          date={date}
          onHoursChange={setHours}
          onDateChange={setDate}
          onNext={() => setStep(2)}
        />
      );
    case 'task':
      return <TaskStep {...shared} hours={hours} date={date} />;
    case 'furniture':
      return <LogFurnitureForm {...shared} />;
    case 'charge':
      return <LogChargeForm {...shared} />;
  }
}

function Saved({
  project,
  saved,
  onLogAnother,
}: {
  project: ProjectDetail;
  saved: SavedEntry;
  onLogAnother: () => void;
}) {
  const router = useRouter();
  const undo = useAction();
  const closeHref = `/projects/${project.id}`;
  const remove = saved.kind === 'charge' ? deleteCharge : deleteFurniture;
  const outstanding = totalCents(buildBillableItems(project));

  return (
    <Confirmation
      eyebrow={`Added to ${project.client}`}
      headline={
        <p className="font-serif text-[clamp(4rem,22vw,6.5rem)] leading-none tabular-nums">
          {formatMoneyWhole(saved.amountCents)}
        </p>
      }
      detail={
        undo.error ??
        `${saved.summary} ${formatMoneyWhole(outstanding)} is now ready to invoice.`
      }
      links={
        <>
          <Link
            href={`${closeHref}/items/${saved.id}`}
            className="inline-flex min-h-11 items-center text-label underline underline-offset-3"
          >
            Edit
          </Link>
          <button
            type="button"
            disabled={undo.pending}
            onClick={() =>
              undo.run(() => remove(saved.id), () => router.push(closeHref))
            }
            className="min-h-11 text-label underline underline-offset-3"
          >
            Undo
          </button>
        </>
      }
      footer={
        <>
          <Button
            type="button"
            variant="onPaintOutline"
            size="xl"
            onClick={onLogAnother}
          >
            Log another
          </Button>
          <Link
            href={closeHref}
            className={buttonVariants({ variant: 'onPaint', size: 'xl' })}
          >
            Done
          </Link>
        </>
      }
    />
  );
}
