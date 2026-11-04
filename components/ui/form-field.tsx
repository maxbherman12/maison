import type { ComponentPropsWithRef, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface FieldMeta {
  label: string;
  error?: { message?: string } | null;
  hint?: string;
}

const LABEL_CLASS =
  'mb-2 block text-xs uppercase tracking-[0.1em] text-muted-foreground';
const CONTROL_CLASS =
  'flex items-center rounded-xl border border-border bg-card transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15';
const INPUT_CLASS =
  'h-11 w-full bg-transparent px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground/70 disabled:cursor-not-allowed disabled:opacity-60';

interface TextFieldProps
  extends Omit<ComponentPropsWithRef<'input'>, 'prefix'>,
    FieldMeta {
  prefix?: ReactNode;
}

export function TextField({
  label,
  error,
  hint,
  prefix,
  className,
  ...props
}: TextFieldProps) {
  return (
    <label className="block">
      <span className={LABEL_CLASS}>{label}</span>
      <span className={CONTROL_CLASS}>
        {prefix && (
          <span className="pl-3 text-sm text-muted-foreground">{prefix}</span>
        )}
        <input
          {...props}
          aria-invalid={error ? true : undefined}
          className={cn(INPUT_CLASS, prefix && 'pl-1.5', className)}
        />
      </span>
      <FieldMessage error={error} hint={hint} />
    </label>
  );
}

interface TextAreaFieldProps
  extends ComponentPropsWithRef<'textarea'>,
    FieldMeta {}

export function TextAreaField({
  label,
  error,
  hint,
  className,
  ...props
}: TextAreaFieldProps) {
  return (
    <label className="block">
      <span className={LABEL_CLASS}>{label}</span>
      <textarea
        {...props}
        aria-invalid={error ? true : undefined}
        className={cn(
          'w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/15',
          className
        )}
      />
      <FieldMessage error={error} hint={hint} />
    </label>
  );
}

interface SelectFieldProps
  extends ComponentPropsWithRef<'select'>,
    FieldMeta {}

export function SelectField({
  label,
  error,
  hint,
  className,
  ...props
}: SelectFieldProps) {
  return (
    <label className="block">
      <span className={LABEL_CLASS}>{label}</span>
      <select
        {...props}
        aria-invalid={error ? true : undefined}
        className={cn(
          'h-11 w-full rounded-xl border border-border bg-card px-3 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15',
          className
        )}
      />
      <FieldMessage error={error} hint={hint} />
    </label>
  );
}

function FieldMessage({
  error,
  hint,
}: {
  error?: { message?: string } | null;
  hint?: string;
}) {
  return (
    <>
      {hint && (
        <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>
      )}
      {error?.message && (
        <span className="mt-1 block text-xs text-destructive">
          {error.message}
        </span>
      )}
    </>
  );
}
