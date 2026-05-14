import React from 'react';
import { cn } from '@/lib/cn';

export interface SpinnerProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

const dim: Record<NonNullable<SpinnerProps['size']>, string> = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-12 w-12 border-[3px]'
};

export function Spinner({ className, size = 'md', label }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label || 'Đang tải'}
      className={cn('inline-block animate-spin rounded-full border-2 border-slate-200 border-t-blue-600', dim[size], className)}
    />
  );
}
