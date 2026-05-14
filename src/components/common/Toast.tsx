import React, { useEffect } from 'react';
import { cn } from '@/lib/cn';

export interface ToastProps {
  open: boolean;
  message: string;
  onClose: () => void;
  variant?: 'info' | 'success' | 'warning' | 'danger';
  durationMs?: number;
}

const styles: Record<NonNullable<ToastProps['variant']>, string> = {
  info: 'border-slate-200 bg-white text-slate-800',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  danger: 'border-red-200 bg-red-50 text-red-900'
};

export function Toast({ open, message, onClose, variant = 'info', durationMs = 5000 }: ToastProps) {
  useEffect(() => {
    if (!open || durationMs <= 0) return undefined;
    const t = window.setTimeout(onClose, durationMs);
    return () => window.clearTimeout(t);
  }, [open, durationMs, onClose]);

  if (!open) return null;

  return (
    <div
      role="status"
      className={cn(
        'fixed bottom-6 left-1/2 z-[5000] w-[min(92vw,28rem)] -translate-x-1/2 rounded-xl border px-4 py-3 text-sm shadow-lg',
        styles[variant]
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="m-0 flex-1 leading-snug">{message}</p>
        <button
          type="button"
          className="shrink-0 rounded border-none bg-transparent text-sm font-medium text-slate-600 hover:text-slate-900"
          onClick={onClose}
        >
          Đóng
        </button>
      </div>
    </div>
  );
}
