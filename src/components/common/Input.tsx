import React from 'react';
import { cn } from '@/lib/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, ...rest },
  ref
) {
  return (
    <input
      ref={ref}
      className={cn(
        'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[hsl(var(--fs-color-primary))] focus:ring-2 focus:ring-[hsl(var(--fs-color-primary)_/_0.15)]',
        invalid && 'border-red-500 focus:border-red-500 focus:ring-red-200',
        className
      )}
      {...rest}
    />
  );
});
