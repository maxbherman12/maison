import type { ComponentPropsWithRef, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface FieldMeta {
  label: string;
  error?: { message?: string } | null;
  hint?: string;
}

const LABEL_CLASS = 'block text-label text-muted-foreground';
const CONTROL_CLASS =
  'flex items-center border-b border-foreground transition-[border-width] focus-within:border-b-2';
const INPUT_CLASS =
  'h-10 w-full bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-60';

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
          <span className="text-base text-muted-foreground">{prefix}</span>
        )}
        <input
          {...props}
          aria-invalid={error ? true : undefined}
          className={cn(INPUT_CLASS, prefix && 'pl-1', className)}
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
          'mt-1.5 block w-full resize-y border border-border bg-transparent px-2.5 py-2 text-base text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground',
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
        <span className="mt-1 block text-label text-muted-foreground">{hint}</span>
      )}
      {error?.message && (
        <span className="mt-1 block text-label text-destructive">
          {error.message}
        </span>
      )}
    </>
  );
}
