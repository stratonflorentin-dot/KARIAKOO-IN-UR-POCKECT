import Link from "next/link";
import type { ComponentProps } from "react";

type Variant = "primary" | "dark" | "outline" | "ghost" | "danger" | "glass";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-brand-600 text-white hover:bg-brand-700 disabled:bg-stone-300 disabled:text-stone-600",
  dark: "bg-ink text-white hover:bg-stone-800 disabled:bg-stone-400",
  outline: "border border-line bg-white text-ink hover:border-brand-300 hover:text-brand-700 disabled:text-stone-400",
  ghost: "text-ink hover:bg-subtle disabled:text-stone-400",
  danger: "bg-red-700 text-white hover:bg-red-800 disabled:bg-stone-300",
  glass: "border border-white/20 bg-white/10 text-white backdrop-blur hover:bg-white/20",
};

const sizes: Record<Size, string> = {
  sm: "h-10 px-3.5 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-base",
};

export function buttonClasses({ variant = "primary", size = "md", full = false }: { variant?: Variant; size?: Size; full?: boolean } = {}) {
  return `inline-flex items-center justify-center gap-2 rounded-full font-semibold transition disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${full ? "w-full" : ""}`;
}

export function Button({
  variant,
  size,
  full,
  className = "",
  type = "button",
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size; full?: boolean }) {
  return <button type={type} className={`${buttonClasses({ variant, size, full })} ${className}`} {...props} />;
}

export function ButtonLink({
  variant,
  size,
  full,
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size; full?: boolean }) {
  return <Link className={`${buttonClasses({ variant, size, full })} ${className}`} {...props} />;
}
