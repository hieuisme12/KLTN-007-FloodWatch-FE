import React from 'react';
import { Spinner } from './Spinner';
import { cn } from '@/lib/cn';

export interface LoadingStateProps {
  label?: string;
  className?: string;
}

export function LoadingState({ label = 'Đang tải dữ liệu…', className }: LoadingStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-16 text-slate-600', className)}>
      <Spinner size="lg" />
      <p className="text-sm">{label}</p>
    </div>
  );
}
