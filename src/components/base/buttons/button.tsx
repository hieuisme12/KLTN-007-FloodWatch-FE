import React from 'react';
import { cn } from '@/lib/cn';
import { Spinner } from '@/components/common/Spinner';

/** Màu nút theo design system (Untitled UI–style). */
export type ButtonColor =
  | 'primary-destructive'
  | 'secondary-destructive'
  | 'danger'
  /** Khởi tạo, mở liên kết, CTA — xanh hệ thống */
  | 'primary'
  /** @deprecated dùng secondary-destructive */
  | 'secondary'
  | 'ghost';

export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  color?: ButtonColor;
  /** @deprecated dùng `color` */
  variant?: ButtonColor;
  size?: ButtonSize;
  loading?: boolean;
}

const colorModifier: Record<ButtonColor, string> = {
  'primary-destructive': 'fs-btn--primary',
  primary: 'fs-btn--primary',
  'secondary-destructive': 'fs-btn--secondary',
  secondary: 'fs-btn--secondary',
  danger: 'fs-btn--danger',
  ghost: 'fs-btn--ghost'
};

const colorClass: Record<ButtonColor, string> = {
  'primary-destructive':
    'border border-transparent bg-[hsl(var(--fs-color-primary))] text-[hsl(var(--fs-color-primary-foreground))] shadow-sm',
  primary:
    'border border-transparent bg-[hsl(var(--fs-color-primary))] text-[hsl(var(--fs-color-primary-foreground))] shadow-sm',
  'secondary-destructive':
    'border border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-900',
  secondary: 'border border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-900',
  danger: 'border border-transparent bg-red-600 text-white shadow-sm hover:bg-red-700',
  ghost: 'border border-transparent bg-transparent text-slate-700 hover:bg-slate-100'
};

const sizeClass: Record<ButtonSize, string> = {
  sm: 'min-h-[2rem] px-3 py-1.5 text-xs',
  md: 'min-h-[2.5rem] px-4 py-2 text-sm',
  lg: 'min-h-[2.75rem] px-5 py-2.5 text-base'
};

function resolveColor(color?: ButtonColor, variant?: ButtonColor): ButtonColor {
  const c = color ?? variant ?? 'primary';
  if (c === 'secondary') return 'secondary-destructive';
  return c;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, color, variant, size = 'md', loading, disabled, children, type = 'button', ...rest },
  ref
) {
  const resolved = resolveColor(color, variant);
  const isDisabled = Boolean(disabled || loading);

  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'fs-btn inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--fs-color-primary))] focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        colorModifier[resolved],
        colorClass[resolved],
        sizeClass[size],
        className
      )}
      disabled={isDisabled}
      {...rest}
    >
      {loading ? <Spinner size="sm" /> : null}
      {children}
    </button>
  );
});

/** Nút Hủy — secondary-destructive */
export const CancelButton = React.forwardRef<HTMLButtonElement, Omit<ButtonProps, 'color' | 'variant'>>(
  function CancelButton(props, ref) {
    return <Button ref={ref} color="secondary-destructive" size="md" {...props} />;
  }
);

/** Nút Xác nhận / Lưu — xanh hệ thống (cặp với Hủy) */
export const ConfirmButton = React.forwardRef<HTMLButtonElement, Omit<ButtonProps, 'color' | 'variant'>>(
  function ConfirmButton(props, ref) {
    return <Button ref={ref} color="primary-destructive" size="md" {...props} />;
  }
);

/** Nút khởi tạo, mở liên kết, CTA — color="primary" */
export const PrimaryButton = React.forwardRef<HTMLButtonElement, Omit<ButtonProps, 'color' | 'variant'>>(
  function PrimaryButton(props, ref) {
    return <Button ref={ref} color="primary" size="md" {...props} />;
  }
);
