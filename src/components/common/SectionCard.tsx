import React from 'react';
import { cn } from '@/lib/cn';

export interface SectionCardProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** Không padding nội dung (bảng full-bleed) */
  flush?: boolean;
}

export function SectionCard({ title, description, children, className, flush }: SectionCardProps) {
  return (
    <section
      className={cn(
        'rounded-[var(--fs-radius-card)] border border-slate-200/80 bg-white shadow-[var(--fs-shadow-card)]',
        className
      )}
    >
      {(title != null && title !== '') || (description != null && description !== '') ? (
        <div className="border-b border-slate-100 px-5 py-4">
          {title != null && title !== '' && <h2 className="text-base font-semibold text-slate-900">{title}</h2>}
          {description != null && description !== '' && (
            <p className="mt-1 text-sm text-slate-600">{description}</p>
          )}
        </div>
      ) : null}
      <div className={flush ? '' : 'p-5'}>{children}</div>
    </section>
  );
}
