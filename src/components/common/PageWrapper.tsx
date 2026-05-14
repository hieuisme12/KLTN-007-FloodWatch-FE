import React from 'react';
import { cn } from '@/lib/cn';

export interface PageWrapperProps {
  children: React.ReactNode;
  className?: string;
  /** max width container */
  maxWidthClass?: string;
}

export function PageWrapper({ children, className, maxWidthClass = 'max-w-7xl' }: PageWrapperProps) {
  return <div className={cn('mx-auto w-full px-4 py-6 sm:px-6 lg:px-8', maxWidthClass, className)}>{children}</div>;
}
