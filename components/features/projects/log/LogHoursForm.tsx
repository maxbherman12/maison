'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { logHours } from '@/lib/actions/charges';
import { useAction } from '@/lib/actions/use-action';
import { todayLocal } from '@/lib/domain/dates';
import { chargeForHours, formatMoneyWhole } from '@/lib/domain/money';
import type { ProjectDetail } from '@/lib/domain/types';
import { FlowBody, FlowFooter } from '@/components/layout/FlowPanel';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/form-field';
import { LogFormFrame } from './LogForms';
import type { SavedEntry } from './ProjectLog';

const HOURS_STEP = 0.5;
const MAX_HOURS = 12;

const hoursWord = (hours: number) => (hours === 1 ? 'hour' : 'hours');

export function HoursStep({
  project,
  header,
  hours,
  date,
  onHoursChange,
  onDateChange,
  onNext,
}: {
  project: ProjectDetail;
  header: ReactNode;
  hours: number;
  date: string;
  onHoursChange: (hours: number) => void;
  onDateChange: (date: string) => void;
  onNext: () => void;
}) {
  const amount = chargeForHours(hours, project.hourlyRateCents);
  const stepBy = (change: number) =>
    onHoursChange(Math.min(MAX_HOURS, Math.max(HOURS_STEP, hours + change)));

  return (
    <>
      <FlowBody>
        {header}
        <h2 className="pt-3 pb-2.5 font-serif text-heading font-normal">
          How long at {project.client}?
        </h2>
        <p className="text-center font-serif text-hero text-primary tabular-nums">
          {hours}
        </p>
        <p className="text-center text-label text-muted-foreground">
          {hoursWord(hours)} · {formatMoneyWhole(amount)}
        </p>
        <div className="flex justify-center gap-7 pt-3">
          <StepButton label="Half an hour less" onClick={() => stepBy(-HOURS_STEP)}>
            −
          </StepButton>
          <StepButton label="Half an hour more" onClick={() => stepBy(HOURS_STEP)}>
            +
          </StepButton>
        </div>
        <div className="pt-3.5">
          <TextField
            label="Date"
            type="date"
            max={todayLocal()}
            value={date}
            onChange={(event) => onDateChange(event.target.value)}
          />
        </div>
      </FlowBody>
      <FlowFooter>
        <Button type="button" size="xl" onClick={onNext}>
          Next
        </Button>
      </FlowFooter>
    </>
  );
}

function StepButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid size-14 place-items-center rounded-full border border-foreground text-2xl transition-transform active:scale-95"
    >
      {children}
    </button>
  );
}

export function TaskStep({
  project,
  header,
  hours,
  date,
  onSaved,
}: {
  project: ProjectDetail;
  header: ReactNode;
  hours: number;
  date: string;
  onSaved: (entry: SavedEntry) => void;
}) {
  const { run, pending, error } = useAction();
  const [note, setNote] = useState('');

  const save = (event: FormEvent) => {
    event.preventDefault();
    const title = note.trim();
    run(
      () => logHours(project.id, { title, date, hours: String(hours) }),
      ({ id }) =>
        onSaved({
          id,
          kind: 'charge',
          amountCents: chargeForHours(hours, project.hourlyRateCents),
          summary: `${title}, ${hours} ${hoursWord(hours)}.`,
        })
    );
  };

  return (
    <LogFormFrame
      question="What did you do?"
      header={header}
      onSubmit={save}
      pending={pending}
      error={error}
    >
      <TextField
        label="Description"
        required
        value={note}
        onChange={(event) => setNote(event.target.value)}
      />
    </LogFormFrame>
  );
}
