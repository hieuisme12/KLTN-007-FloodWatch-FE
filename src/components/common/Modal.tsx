import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/cn';

export interface ModalProps {
  open: boolean;
  onClose?: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  /** Nếu false, click overlay không đóng */
  closeOnOverlay?: boolean;
}

const sizeClass: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg'
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = 'md',
  className,
  closeOnOverlay = true
}: ModalProps) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[4500] flex items-center justify-center p-4"
      role="presentation"
      style={{ backgroundColor: 'rgba(2, 6, 23, 0.88)' }}
      onMouseDown={(e) => {
        if (closeOnOverlay && e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative z-10 w-full rounded-2xl border border-slate-200/90 bg-white p-6 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.35)]',
          sizeClass[size],
          className
        )}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {title != null && title !== '' && (
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        )}
        {description != null && description !== '' && (
          <div className="mt-3 text-sm leading-relaxed text-slate-600">{description}</div>
        )}
        <div className={title != null || description != null ? 'mt-4' : ''}>{children}</div>
      </div>
    </div>,
    document.body
  );
}
