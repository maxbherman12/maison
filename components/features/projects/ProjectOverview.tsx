'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ChevronLeft, Pencil } from 'lucide-react';
import { buildBillableItems, totalCents } from '@/lib/domain/billing';
import { formatMoneyWhole } from '@/lib/domain/money';
import { paintStyle } from '@/lib/domain/paints';
import type { InvoiceListItem, ProjectDetail } from '@/lib/domain/types';
import { cn } from '@/lib/utils';
import { AccountMenu } from '@/components/features/auth/AccountMenu';
import { Button, buttonVariants } from '@/components/ui/button';
import { SegmentedTabs } from '@/components/ui/segmented-tabs';
import { FurnitureList, InvoiceList, TimeList } from './ProjectLists';

type ProjectTab = 'time' | 'furniture' | 'invoices';

/**
 * A client's painted wall above their three lists. Phones show one list at a
 * time under tabs. Desktop shows all three side by side.
 */
export function ProjectOverview({
  project,
  invoices,
}: {
  project: ProjectDetail;
  invoices: InvoiceListItem[];
}) {
  const [tab, setTab] = useState<ProjectTab>('time');
  const base = `/projects/${project.id}`;
  const pending = buildBillableItems(project);
  const outstanding = totalCents(pending);
  const timeCount = pending.filter((item) => item.kind !== 'furniture').length;

  const addPiece = (
    <Link
      href={`${base}/log?type=furniture`}
      className="inline-flex min-h-8 items-center text-label underline underline-offset-3 max-md:min-h-11"
    >
      Add a piece
    </Link>
  );

  const actions = (outline: 'outline' | 'onPaintOutline', solid: 'default' | 'onPaint') => (
    <>
      <Link
        href={`${base}/log`}
        className={buttonVariants({ variant: outline, size: 'xl' })}
      >
        Log
      </Link>
      {outstanding > 0 ? (
        <Link
          href={`${base}/invoices/new`}
          className={buttonVariants({ variant: solid, size: 'xl' })}
        >
          Invoice
        </Link>
      ) : (
        <Button variant={solid} size="xl" disabled>
          Invoice
        </Button>
      )}
    </>
  );

  return (
    <div style={paintStyle(project.paint)} className="flex min-h-0 flex-1 flex-col">
      <header className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto] gap-x-3 bg-primary px-6 pt-[max(0.5rem,env(safe-area-inset-top))] pb-3.5 text-primary-foreground motion-safe:animate-paint-down md:items-end md:px-8 md:py-6">
        <div className="col-span-2 flex items-center gap-0.5 md:col-span-1">
          <Link
            href="/projects"
            aria-label="All clients"
            className="-ml-2.5 flex size-11 shrink-0 items-center justify-center md:hidden"
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
          </Link>
          <h1 className="min-w-0 truncate font-serif text-heading font-normal md:text-amount">
            {project.client}
          </h1>
          <Link
            href={`${base}/edit`}
            aria-label="Edit project details"
            title="Edit project details"
            className="flex size-11 shrink-0 items-center justify-center opacity-85 hover:opacity-100"
          >
            <Pencil className="size-3.5" aria-hidden="true" />
          </Link>
          <AccountMenu className="-mr-2.5 ml-auto text-inherit md:hidden" />
        </div>

        <p className="min-w-0 self-end pl-[26px] text-label opacity-85 md:col-start-1 md:row-start-2 md:pl-0">
          <span className="block truncate md:inline">{project.name}</span>
          <span className="max-md:hidden"> · {project.address && `${project.address} · `}</span>
          <span className="block md:inline">
            {formatMoneyWhole(project.hourlyRateCents)} an hour
          </span>
        </p>

        <div className="text-right md:col-start-2 md:row-span-2 md:row-start-1">
          <p className="font-serif text-name tabular-nums md:text-amount max-md:leading-none">
            {formatMoneyWhole(outstanding)}
          </p>
          <p className="text-label opacity-85">ready to invoice</p>
          <div className="hidden gap-2 pt-3 md:flex md:w-64">
            {actions('onPaintOutline', 'onPaint')}
          </div>
        </div>
      </header>

      <SegmentedTabs
        ariaLabel="Project lists"
        idPrefix="project"
        value={tab}
        onChange={setTab}
        items={[
          { value: 'time', label: 'Time', count: timeCount },
          { value: 'furniture', label: 'Furniture', count: project.furniture.length },
          { value: 'invoices', label: 'Invoices', count: invoices.length },
        ]}
        className="mx-6 shrink-0 md:hidden"
      />

      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)] md:grid-cols-[1.25fr_1.15fr_0.8fr] md:divide-x md:divide-border">
        <Column value="time" tab={tab} heading={`Time and charges · ${timeCount}`}>
          <TimeList project={project} />
        </Column>
        <Column
          value="furniture"
          tab={tab}
          heading={`Furniture · ${project.furniture.length}`}
          action={addPiece}
        >
          <FurnitureList project={project} />
          <div className="md:hidden">{addPiece}</div>
        </Column>
        <Column value="invoices" tab={tab} heading={`Invoices · ${invoices.length}`}>
          <InvoiceList projectId={project.id} invoices={invoices} />
        </Column>
      </div>

      <footer className="flex shrink-0 gap-2.5 px-5 pt-2.5 pb-[max(1.125rem,env(safe-area-inset-bottom))] md:hidden">
        {actions('outline', 'default')}
      </footer>
    </div>
  );
}

function Column({
  value,
  tab,
  heading,
  action,
  children,
}: {
  value: ProjectTab;
  tab: ProjectTab;
  heading: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      id={`project-panel-${value}`}
      aria-labelledby={`project-tab-${value}`}
      className={cn(
        'flex min-h-0 min-w-0 flex-col px-6 pt-1 md:px-5.5 md:pt-4 md:pb-3',
        tab !== value && 'max-md:hidden'
      )}
    >
      <div className="hidden min-h-8 shrink-0 items-center justify-between pb-1 md:flex">
        <h2 className="text-label font-normal text-muted-foreground">{heading}</h2>
        {action}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
    </section>
  );
}
