import type { ReactNode } from "react";

export type Tone = "neutral" | "brand" | "success" | "warning" | "danger" | "info" | "dark";

const tones: Record<Tone, string> = {
  neutral: "bg-stone-100 text-stone-700",
  brand: "bg-brand-50 text-brand-800",
  success: "bg-emerald-50 text-emerald-800",
  warning: "bg-amber-50 text-amber-900",
  danger: "bg-red-50 text-red-800",
  info: "bg-sky-50 text-sky-800",
  dark: "bg-night text-white",
};

export function Badge({ tone = "neutral", children, className = "" }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]} ${className}`}>
      {children}
    </span>
  );
}

export function DemoTag({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900 ${className}`}>
      Demo data
    </span>
  );
}
