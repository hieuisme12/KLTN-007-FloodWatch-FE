import React from 'react';
import { cn } from '@/lib/cn';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  sortable?: boolean;
  className?: string;
  render?: (row: T) => React.ReactNode;
}

export interface DataTableProps<T extends Record<string, unknown>> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string | number;
  sortKey?: string | null;
  sortDir?: 'asc' | 'desc';
  onSortChange?: (key: string, dir: 'asc' | 'desc') => void;
  emptyMessage?: string;
  className?: string;
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  rows,
  rowKey,
  sortKey,
  sortDir,
  onSortChange,
  emptyMessage = 'Không có dữ liệu',
  className
}: DataTableProps<T>) {
  if (!rows.length) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-600">
        {emptyMessage}
      </div>
    );
  }

  const toggleSort = (key: string, sortable?: boolean) => {
    if (!sortable || !onSortChange) return;
    if (sortKey === key) {
      onSortChange(key, sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      onSortChange(key, 'asc');
    }
  };

  return (
    <div className={cn('overflow-x-auto rounded-lg border border-slate-200', className)}>
      <table className="min-w-full border-collapse text-left text-sm">
        <thead className="sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_0_rgb(226_232_240)]">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'whitespace-nowrap px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-600',
                  col.sortable && onSortChange && 'cursor-pointer select-none hover:bg-slate-100',
                  col.className
                )}
                onClick={() => toggleSort(col.key, col.sortable)}
              >
                <span className="inline-flex items-center gap-1">
                  {col.header}
                  {col.sortable && sortKey === col.key ? <span aria-hidden>{sortDir === 'asc' ? '▲' : '▼'}</span> : null}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.map((row, idx) => (
            <tr key={String(rowKey(row, idx))} className={cn('hover:bg-slate-50/80', idx % 2 === 1 && 'bg-slate-50/40')}>
              {columns.map((col) => (
                <td key={col.key} className={cn('px-3 py-2 text-slate-800', col.className)}>
                  {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
