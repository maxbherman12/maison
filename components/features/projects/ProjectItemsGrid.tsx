'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { Search, X } from 'lucide-react';
import type { Project } from '@/lib/types';
import type { BillableRow } from '@/lib/billing';
import { buildBillableRows } from '@/lib/billing';
import { cn } from '@/lib/utils';

// AG Grid touches the DOM as soon as it mounts, so it is loaded client-side
// only. It also keeps the grid bundle out of the rest of the app.
const ProjectItemsGridInner = dynamic(
  () =>
    import('./ProjectItemsGridInner').then((mod) => mod.ProjectItemsGridInner),
  {
    ssr: false,
    loading: () => (
      <div className="h-full min-h-48 w-full animate-pulse rounded-2xl border border-border bg-secondary" />
    ),
  }
);

interface ProjectItemsGridProps {
  project: Project;
  onOpenItem: (row: BillableRow) => void;
  /** Fill the parent height and scroll rows inside the grid. */
  fill?: boolean;
}

export function ProjectItemsGrid({
  project,
  onOpenItem,
  fill = false,
}: ProjectItemsGridProps) {
  const [quickFilter, setQuickFilter] = useState('');

  const rows = useMemo(() => buildBillableRows(project), [project]);

  if (rows.length === 0) {
    return (
      <div
        className={cn(
          fill
            ? 'flex min-h-0 flex-1 flex-col items-center justify-center p-6 text-center'
            : 'rounded-2xl border border-dashed border-border bg-secondary p-8 text-center'
        )}
      >
        <p className="font-serif text-xl">Nothing pending</p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
          Every logged hour and furniture item on this project has been
          invoiced. Log more work to see it here.
        </p>
      </div>
    );
  }

  return (
    <div className={cn(fill && 'flex min-h-0 flex-1 flex-col')}>
      <div className="mb-3 flex items-center justify-end">
        <label className="flex h-10 w-full items-center gap-2 rounded-xl border border-border bg-secondary px-3 transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15 sm:w-64">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <span className="sr-only">Search pending items</span>
          <input
            type="search"
            value={quickFilter}
            onChange={(event) => setQuickFilter(event.target.value)}
            placeholder="Search items"
            // Hide the native clear button — the one below does the job.
            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/70 [&::-webkit-search-cancel-button]:appearance-none"
          />
          {quickFilter && (
            <button
              type="button"
              onClick={() => setQuickFilter('')}
              aria-label="Clear search"
              className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </label>
      </div>

      <div className={cn(fill && 'min-h-0 flex-1')}>
        <ProjectItemsGridInner
          rows={rows}
          quickFilter={quickFilter}
          onOpenItem={onOpenItem}
          fill={fill}
        />
      </div>
    </div>
  );
}
