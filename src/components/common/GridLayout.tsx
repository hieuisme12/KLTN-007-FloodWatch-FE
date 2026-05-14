import React from 'react';
import { cn } from '@/lib/cn';

export interface GridLayoutProps {
  children: React.ReactNode;
  className?: string;
  cols?: 1 | 2 | 3 | 4;
  gapClass?: string;
}

const colsMap: Record<NonNullable<GridLayoutProps['cols']>, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-4'
};

export function GridLayout({ children, className, cols = 3, gapClass = 'gap-4' }: GridLayoutProps) {
  return <div className={cn('grid', colsMap[cols], gapClass, className)}>{children}</div>;
}
