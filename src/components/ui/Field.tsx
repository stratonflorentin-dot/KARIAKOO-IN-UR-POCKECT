import type { ReactNode } from "react";

export const inputClass =
  "mt-1 block min-h-12 w-full rounded-xl border border-stone-300 bg-white px-4 text-base text-ink shadow-sm shadow-stone-950/[0.02] outline-none transition placeholder:text-stone-400 focus:border-brand-600 focus:ring-4 focus:ring-brand-600/10 aria-[invalid=true]:border-red-600 aria-[invalid=true]:focus:ring-red-600/10";

export const compactInputClass =
  "h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm shadow-sm shadow-stone-950/[0.02] outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-brand-600/10";

/** Label + control + hint/error, wired up for screen readers via ids. */
export function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

/** aria props for a control rendered inside <Field>. */
export function fieldAria(id: string, error?: string, hint?: string) {
  return {
    "aria-invalid": Boolean(error),
    "aria-describedby": error ? `${id}-error` : hint ? `${id}-hint` : undefined,
  } as const;
}
