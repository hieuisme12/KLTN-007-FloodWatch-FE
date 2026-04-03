import { cn } from '@/lib/cn';

const variants = {
  default: 'border-transparent bg-slate-100 text-slate-800',
  primary: 'border-transparent bg-blue-100 text-blue-800',
  success: 'border-transparent bg-emerald-100 text-emerald-800',
  warning: 'border-transparent bg-amber-100 text-amber-900',
  danger: 'border-transparent bg-red-100 text-red-800'
};

export function Badge({ className, variant = 'default', children, ...props }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
        variants[variant] || variants.default,
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
