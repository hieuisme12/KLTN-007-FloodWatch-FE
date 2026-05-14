import React from 'react';
import { cn } from '@/lib/cn';

export interface SkeletonLoaderProps {
  className?: string;
  /** số dòng placeholder */
  lines?: number;
}

export function SkeletonLoader({ className, lines = 3 }: SkeletonLoaderProps) {
  return (
    <div className={cn('animate-pulse space-y-3', className)} aria-hidden>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-3 rounded bg-slate-200" style={{ width: `${90 - i * 10}%` }} />
      ))}
    </div>
  );
}
