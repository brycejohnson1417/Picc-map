'use client';

import { Search, X } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import type { TerritoryFilterCount } from '@/lib/territory/types';
import { cn } from '@/lib/utils';

interface TerritoryFilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  statuses: TerritoryFilterCount[];
  reps: TerritoryFilterCount[];
  selectedStatuses: string[];
  selectedReps: string[];
  onToggleStatus: (value: string) => void;
  onToggleRep: (value: string) => void;
  onClearFilters: () => void;
}

export function TerritoryFilterBar({
  search,
  onSearchChange,
  statuses,
  reps,
  selectedStatuses,
  selectedReps,
  onToggleStatus,
  onToggleRep,
  onClearFilters,
}: TerritoryFilterBarProps) {
  return (
    <div className="space-y-2 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-950/95">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input value={search} onChange={(event) => onSearchChange(event.target.value)} className="h-10 pl-9 pr-9" placeholder="Search store name" />
        {search ? (
          <button
            type="button"
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            onClick={() => onSearchChange('')}
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <FilterRow label="Status" items={statuses} selected={selectedStatuses} onToggle={onToggleStatus} />
      <FilterRow label="Rep" items={reps} selected={selectedReps} onToggle={onToggleRep} />

      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={onClearFilters}>
          Clear Filters
        </Button>
      </div>
    </div>
  );
}

function FilterRow({
  label,
  items,
  selected,
  onToggle,
}: {
  label: string;
  items: TerritoryFilterCount[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {items.length === 0 ? <p className="text-xs text-slate-500">No values available</p> : null}
        {items.map((item) => {
          const active = selected.includes(item.value);
          return (
            <button
              key={`${label}-${item.value}`}
              type="button"
              onClick={() => onToggle(item.value)}
              className={cn(
                'whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                active
                  ? 'border-blue-500 bg-blue-600 text-white'
                  : 'border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200',
              )}
            >
              {item.value} ({item.count})
            </button>
          );
        })}
      </div>
    </div>
  );
}
