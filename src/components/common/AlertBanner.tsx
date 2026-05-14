import React from 'react';
import { cn } from '@/lib/cn';

export interface AlertBannerProps {
  title?: string;
  children: React.ReactNode;
  variant?: 'info' | 'success' | 'warning' | 'danger';
  className?: string;
  onDismiss?: () => void;
}

const ring: Record<NonNullable<AlertBannerProps['variant']>, string> = {
  info: 'border-blue-200 bg-blue-50 text-blue-950',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-950',
  warning: 'border-amber-200 bg-amber-50 text-amber-950',
  danger: 'border-red-200 bg-red-50 text-red-950'
};

export function AlertBanner({ title, children, variant = 'info', className, onDismiss }: AlertBannerProps) {
  return (
    <div
      role="alert"
      className={cn('flex gap-3 rounded-lg border px-4 py-3 text-sm', ring[variant], className)}
    >
      <div className="min-w-0 flex-1">
        {title ? <p className="m-0 font-semibold">{title}</p> : null}
        <div className={title ? 'mt-1 leading-relaxed' : ''}>{children}</div>
      </div>
      {onDismiss ? (
        <button
          type="button"
          className="shrink-0 self-start rounded border-none bg-transparent text-sm font-medium underline-offset-2 hover:underline"
          onClick={onDismiss}
        >
          Đóng
        </button>
      ) : null}
    </div>
  );
}
