'use client';

import {
  ColumnDef,
  SortingState,
  VisibilityState,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Download, Filter, Settings2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button, Input } from '@/components/ui';

interface Props<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  title: string;
  searchPlaceholder?: string;
  onExportCsv?: () => void;
}

export function AdvancedDataTable<TData, TValue>({
  columns,
  data,
  title,
  searchPlaceholder = 'Search...',
  onExportCsv,
}: Props<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [globalFilter, setGlobalFilter] = useState('');

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: 'includesString',
  });

  const selectedCount = useMemo(() => Object.keys(rowSelection).length, [rowSelection]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 rounded-xl border p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-h2 font-semibold">{title}</h2>
          <p className="text-sm text-slate-500">Sticky headers, saved views, and bulk actions for power users.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={globalFilter}
            onChange={(event) => setGlobalFilter(event.target.value)}
            placeholder={searchPlaceholder}
            className="w-[260px]"
          />
          <Button variant="secondary"><Filter className="h-4 w-4" /> Filters</Button>
          <Button variant="secondary"><Settings2 className="h-4 w-4" /> Saved Views</Button>
          <Button variant="outline" onClick={onExportCsv}><Download className="h-4 w-4" /> Export</Button>
        </div>
      </div>

      {selectedCount > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
          <span>{selectedCount} selected</span>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary">Tag</Button>
            <Button size="sm" variant="secondary">Assign</Button>
            <Button size="sm" variant="danger">Delete</Button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border">
        <div className="max-h-[560px] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-900">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className="whitespace-nowrap border-b px-3 py-2 text-left font-semibold">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row, idx) => (
                  <tr
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                    className={idx % 2 === 0 ? 'bg-white dark:bg-slate-950' : 'bg-slate-50/50 dark:bg-slate-900/30'}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="border-b px-3 py-2 align-top">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="h-28 text-center text-slate-500">
                    No results.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            Previous
          </Button>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
