import React from 'react';
import { cn } from '@/lib/cn';
import { Input, type InputProps } from './Input';

export interface FormLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export function FormLabel({ className, children, required, ...rest }: FormLabelProps) {
  return (
    <label className={cn('mb-1 block text-sm font-medium text-slate-800', className)} {...rest}>
      {children}
      {required ? <span className="ml-0.5 text-red-500">*</span> : null}
    </label>
  );
}

export interface FormErrorProps {
  message?: string | null;
  className?: string;
}

export function FormError({ message, className }: FormErrorProps) {
  if (!message) return null;
  return <p className={cn('mt-1 text-xs text-red-600', className)}>{message}</p>;
}

export interface FormGroupProps {
  children: React.ReactNode;
  className?: string;
}

export function FormGroup({ children, className }: FormGroupProps) {
  return <div className={cn('mb-4', className)}>{children}</div>;
}

export interface FormFieldProps {
  label: string;
  htmlFor: string;
  error?: string | null;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function FormField({ label, htmlFor, error, required, children, className }: FormFieldProps) {
  return (
    <FormGroup className={className}>
      <FormLabel htmlFor={htmlFor} required={required}>
        {label}
      </FormLabel>
      {children}
      <FormError message={error} />
    </FormGroup>
  );
}

export interface ControlledInputProps extends InputProps {
  label: string;
  htmlFor: string;
  error?: string | null;
  required?: boolean;
}

export function ControlledInput({ label, htmlFor, error, required, id, ...inputProps }: ControlledInputProps) {
  const inputId = id ?? htmlFor;
  return (
    <FormField label={label} htmlFor={htmlFor} error={error} required={required}>
      <Input id={inputId} invalid={Boolean(error)} {...inputProps} />
    </FormField>
  );
}
