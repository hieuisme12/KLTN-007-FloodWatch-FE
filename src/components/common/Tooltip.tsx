import React from 'react';
import { cn } from '@/lib/cn';

export interface TooltipProps {
  label: string;
  children: React.ReactNode;
  className?: string;
}

/** Tooltip nhẹ: dùng `title` + style focus — không che layout phức tạp. */
export function Tooltip({ label, children, className }: TooltipProps) {
  return (
    <span className={cn('inline-flex', className)} title={label}>
      {children}
    </span>
  );
}
