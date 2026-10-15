import Link from "next/link";

/** KARIAKOO wordmark: a bold black/white word with an orange "K" mark. */
export function Logo({ tone = "dark", href = "/customer", compact = false }: { tone?: "dark" | "light"; href?: string; compact?: boolean }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2" aria-label="KARIAKOO home">
      <span aria-hidden="true" className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-base font-black text-white shadow-[inset_0_-3px_0_rgba(0,0,0,0.2)]">
        K
      </span>
      {!compact && (
        <span className={`text-lg font-extrabold tracking-[0.08em] ${tone === "light" ? "text-white" : "text-ink"}`}>KARIAKOO</span>
      )}
    </Link>
  );
}
