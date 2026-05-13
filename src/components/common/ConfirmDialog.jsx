import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/cn';

/**
 * Hộp thoại xác nhận — nền tối full màn (inline rgba, không blur) để tránh flash trắng lúc mở.
 * @param {'primary' | 'danger'} variant — nút xác nhận: xanh dự án hoặc đỏ (xóa / thao tác nguy hiểm).
 */
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Hủy',
  onConfirm,
  onCancel,
  variant = 'primary'
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onCancel?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open || typeof document === 'undefined') return null;

  const confirmBtnClass =
    variant === 'danger'
      ? 'rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700'
      : 'rounded-lg bg-[#1976d2] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1565c0]';

  return createPortal(
    <div
      className="fixed inset-0 z-[4500] flex items-center justify-center p-4"
      role="presentation"
      style={{ backgroundColor: 'rgba(2, 6, 23, 0.88)' }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel?.();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200/90 bg-white p-6 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.35)]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-dialog-title" className="text-lg font-semibold text-slate-900">
          {title}
        </h2>
        <div className="mt-3 text-sm leading-relaxed text-slate-600">{description}</div>
        <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button type="button" className={cn(confirmBtnClass)} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
