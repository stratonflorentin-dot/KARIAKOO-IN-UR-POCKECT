import type { ReactNode } from "react";

export function Card({ children, className = "", as: Tag = "section", ...rest }: {
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "article" | "aside";
} & Record<`aria-${string}`, string | undefined>) {
  return (
    <Tag className={`rounded-3xl border border-stone-200/80 bg-white p-4 shadow-sm shadow-stone-950/[0.025] sm:p-5 ${className}`} {...rest}>
      {children}
    </Tag>
  );
}

export function CardHeader({ title, id, action, subtitle }: { title: string; id?: string; action?: ReactNode; subtitle?: string }) {
  return (
    <div className="mb-3 flex items-start justify-between gap-3">
      <div>
        <h2 id={id} className="font-semibold tracking-tight text-ink">{title}</h2>
        {subtitle && <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({ label, value, hint, icon }: { label: string; value: string; hint?: string; icon?: ReactNode }) {
  return (
    <div className="rounded-3xl border border-stone-200/80 bg-white p-4 shadow-sm shadow-stone-950/[0.025] sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-muted">{label}</p>
        {icon && <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand-700" aria-hidden="true">{icon}</span>}
      </div>
      <p className="mt-3 text-2xl font-bold tabular-nums tracking-tight text-ink sm:text-[1.75rem]">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[1.75rem]">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
