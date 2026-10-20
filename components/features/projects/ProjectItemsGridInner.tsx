'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
} from 'ag-grid-community';
import type {
  ColDef,
  GridApi,
  GridReadyEvent,
  ICellRendererParams,
  ModelUpdatedEvent,
} from 'ag-grid-community';
import { formatMoney } from '@/lib/types';
import type { BillableRow } from '@/lib/billing';

ModuleRegistry.registerModules([AllCommunityModule]);

const maisonTheme = themeQuartz.withParams({
  accentColor: '#bd765b',
  backgroundColor: '#fbfaf7',
  foregroundColor: '#292923',
  textColor: '#292923',
  borderColor: '#deddd5',
  borderWidth: 1,
  borderRadius: 8,
  chromeBackgroundColor: '#f1e6df',
  headerBackgroundColor: '#f1e6df',
  headerTextColor: '#6b564a',
  headerFontSize: 11,
  headerFontWeight: 600,
  cellTextColor: '#292923',
  cellFontSize: 14,
  fontFamily: ['ui-sans-serif', 'system-ui', 'sans-serif'],
  fontSize: 14,
  rowHoverColor: 'rgba(189, 118, 91, 0.08)',
  selectedRowBackgroundColor: 'rgba(189, 118, 91, 0.14)',
  oddRowBackgroundColor: 'rgba(41, 41, 35, 0.02)',
  rowHeight: 52,
  spacing: 6,
  wrapperBorder: { color: '#deddd5', width: 1, style: 'solid' },
  wrapperBorderRadius: 16,
  pinnedRowBackgroundColor: '#f1e6df',
  pinnedRowTextColor: '#292923',
  pinnedRowFontWeight: 600,
  pinnedRowBorder: { color: '#deddd5', width: 1, style: 'solid' },
});

// The grid is sized to its rows so a project with three pending items does not
// get a wall of empty space, while a long list still scrolls inside the grid.
const ROW_HEIGHT = 52;
const HEADER_HEIGHT = 40;
const MAX_GRID_HEIGHT = 560;

interface GridContext {
  isCompact: boolean;
}

interface ProjectItemsGridInnerProps {
  rows: BillableRow[];
  quickFilter: string;
}

export function ProjectItemsGridInner({
  rows,
  quickFilter,
}: ProjectItemsGridInnerProps) {
  const isCompact = useMediaQuery('(max-width: 767px)');
  const [pinnedBottomRowData, setPinnedBottomRowData] = useState<BillableRow[]>([]);
  const lastTotal = useRef<number | null>(null);

  const context = useMemo<GridContext>(() => ({ isCompact }), [isCompact]);

  const columnDefs = useMemo<ColDef<BillableRow>[]>(
    () => [
      {
        field: 'type',
        headerName: 'Type',
        width: isCompact ? 92 : 104,
        minWidth: isCompact ? 88 : 96,
        maxWidth: 130,
        sortable: true,
        filter: 'agTextColumnFilter',
        // Pin the data type so AG Grid does not infer a column type from the
        // first row's value and then mis-format the rest of the column.
        cellDataType: 'text',
        cellRenderer: TypeCell,
      },
      {
        field: 'description',
        headerName: 'Description',
        flex: 2,
        minWidth: isCompact ? 130 : 150,
        sortable: true,
        filter: 'agTextColumnFilter',
        cellDataType: 'text',
        cellRenderer: DescriptionCell,
        // Searching a row should match any of its parts, not just the title.
        filterValueGetter: (params) => searchableText(params.data),
        getQuickFilterText: (params) => searchableText(params.data),
      },
      {
        field: 'secondary',
        headerName: 'Detail',
        flex: 1,
        minWidth: 116,
        sortable: true,
        filter: 'agTextColumnFilter',
        cellDataType: 'text',
        cellClass: 'text-[#85857a]',
        hide: isCompact,
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 126,
        minWidth: 116,
        maxWidth: 150,
        sortable: true,
        filter: 'agTextColumnFilter',
        cellDataType: 'text',
        cellRenderer: StatusCell,
        hide: isCompact,
      },
      {
        field: 'hours',
        headerName: 'Hours',
        width: 92,
        minWidth: 84,
        maxWidth: 110,
        sortable: true,
        filter: 'agNumberColumnFilter',
        type: 'numericColumn',
        cellDataType: 'number',
        cellClass: 'text-[#85857a]',
        valueFormatter: ({ value }: { value: number | null }) =>
          value == null ? '—' : String(value),
        hide: isCompact,
      },
      {
        field: 'amount',
        headerName: 'Amount',
        width: isCompact ? 96 : 124,
        minWidth: isCompact ? 92 : 112,
        maxWidth: 160,
        sortable: true,
        filter: 'agNumberColumnFilter',
        type: 'numericColumn',
        cellDataType: 'number',
        cellClass: 'font-medium',
        valueFormatter: ({ value }: { value: number }) => formatMoney(value),
        // Keep the money in view while the rest of the row scrolls sideways.
        pinned: 'right',
      },
    ],
    [isCompact]
  );

  const defaultColDef = useMemo<ColDef<BillableRow>>(
    () => ({
      resizable: true,
    }),
    []
  );

  // Keep the pinned total in step with whatever the user has filtered to.
  const syncTotal = useCallback((api: GridApi<BillableRow>) => {
    let total = 0;
    api.forEachNodeAfterFilterAndSort((node) => {
      total += node.data?.amount ?? 0;
    });

    if (lastTotal.current === total) return;
    lastTotal.current = total;

    setPinnedBottomRowData([
      {
        id: 'pending-total',
        itemId: '',
        source: 'hours',
        type: '',
        description: 'Pending total',
        secondary: '',
        status: null,
        hours: null,
        amount: total,
      },
    ]);
  }, []);

  const handleModelUpdated = useCallback(
    (event: ModelUpdatedEvent) => syncTotal(event.api),
    [syncTotal]
  );

  const handleGridReady = useCallback(
    (event: GridReadyEvent) => syncTotal(event.api),
    [syncTotal]
  );

  const gridHeight = Math.min(
    MAX_GRID_HEIGHT,
    rows.length * ROW_HEIGHT + HEADER_HEIGHT + ROW_HEIGHT + 2
  );

  return (
    <div className="w-full" style={{ height: gridHeight }}>
      <AgGridReact<BillableRow>
        theme={maisonTheme}
        context={context}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        rowData={rows}
        pinnedBottomRowData={pinnedBottomRowData}
        getRowId={(params) => params.data.id}
        quickFilterText={quickFilter}
        onModelUpdated={handleModelUpdated}
        onGridReady={handleGridReady}
        animateRows={false}
        enableCellTextSelection
        tooltipShowDelay={400}
        suppressMovableColumns
      />
    </div>
  );
}

function searchableText(row: BillableRow | undefined): string {
  if (!row) return '';
  return [row.type, row.description, row.secondary, row.status, row.hours]
    .filter((part) => part != null && part !== '')
    .join(' ');
}

function TypeCell({ value }: ICellRendererParams<BillableRow, string>) {
  if (!value) return null;

  const isHours = value === 'Hours';
  return (
    <div className="absolute inset-0 flex items-center">
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium leading-tight tracking-wide ${
          isHours
            ? 'bg-[#dbe1d4] text-[#5b6753]'
            : 'bg-[#f1e6df] text-[#a9573d]'
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function DescriptionCell({
  data,
  context,
}: ICellRendererParams<BillableRow, string>) {
  if (!data) return null;

  const isCompact = (context as GridContext | undefined)?.isCompact ?? false;
  const subLine = [
    data.secondary,
    data.hours != null ? `${data.hours} hrs` : null,
    data.status,
  ]
    .filter((part) => part != null && part !== '')
    .join(' · ');

  return (
    <div className="absolute inset-0 flex flex-col justify-center">
      <span className="font-medium leading-tight text-[#292923]">
        {data.description}
      </span>
      {isCompact && subLine && (
        <span className="mt-0.5 text-xs leading-tight text-[#85857a]">
          {subLine}
        </span>
      )}
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  Pending: 'bg-[#f1e6df] text-[#a9573d]',
  Ordered: 'bg-[#e6e1d3] text-[#7a6a4f]',
  'In transit': 'bg-[#dde3e6] text-[#4f6068]',
  Delivered: 'bg-[#dbe1d4] text-[#5b6753]',
};

function StatusCell({ value }: ICellRendererParams<BillableRow, string | null>) {
  if (!value) {
    return (
      <div className="absolute inset-0 flex items-center text-[#b3b2a6]">
        —
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex items-center">
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium leading-tight ${
          STATUS_STYLES[value] ?? 'bg-[#ece9e0] text-[#85857a]'
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const list = window.matchMedia(query);
    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);
    setMatches(list.matches);
    list.addEventListener('change', onChange);
    return () => list.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}
