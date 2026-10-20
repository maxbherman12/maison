'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { Search, X } from 'lucide-react';
import type { Project } from '@/lib/types';
import { buildBillableRows } from '@/lib/billing';

// AG Grid touches the DOM as soon as it mounts, so it is loaded client-side
// only. It also keeps the grid bundle out of the rest of the app.
const ProjectItemsGridInner = dynamic(
  () =>
    import('./ProjectItemsGridInner').then((mod) => mod.ProjectItemsGridInner),
  {
    ssr: false,
    loading: () => (
      <div className="h-48 w-full animate-pulse rounded-2xl border border-[#deddd5] bg-[#fbfaf7]" />
    ),
  }
);

interface ProjectItemsGridProps {
  project: Project;
}

export function ProjectItemsGrid({ project }: ProjectItemsGridProps) {
  const [quickFilter, setQuickFilter] = useState('');

  const rows = useMemo(() => buildBillableRows(project), [project]);

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[#deddd5] bg-[#fbfaf7] p-8 text-center">
        <p className="font-serif text-xl">Nothing pending</p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-[#85857a]">
          Every logged hour and furniture item on this project has been
          invoiced. Log more work to see it here.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-serif text-2xl">Pending items</h2>
          <p className="mt-1 text-sm text-[#85857a]">
            {rows.length} {rows.length === 1 ? 'item' : 'items'} awaiting
            invoicing
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex h-10 flex-1 items-center gap-2 rounded-xl border border-[#deddd5] bg-[#fbfaf7] px-3 focus-within:border-[#bd765b] sm:w-64 sm:flex-none">
            <Search className="size-4 shrink-0 text-[#99998e]" />
            <span className="sr-only">Search pending items</span>
            <input
              type="search"
              value={quickFilter}
              onChange={(event) => setQuickFilter(event.target.value)}
              placeholder="Search items"
              // Hide the native clear button — the one below does the job.
              className="w-full bg-transparent text-sm outline-none placeholder:text-[#b3b2a6] [&::-webkit-search-cancel-button]:appearance-none"
            />
            {quickFilter && (
              <button
                type="button"
                onClick={() => setQuickFilter('')}
                aria-label="Clear search"
                className="shrink-0 text-[#99998e] hover:text-[#292923]"
              >
                <X className="size-4" />
              </button>
            )}
          </label>
        </div>
      </div>

      <ProjectItemsGridInner rows={rows} quickFilter={quickFilter} />
    </div>
  );
}
