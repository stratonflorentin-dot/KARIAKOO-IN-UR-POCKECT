import Link from "next/link";

/**
 * KARIAKOO brand lockup. A gold shopping-bag "K" mark (with delivery speed
 * lines) next to the wordmark, optionally over the "AT UR POCKET" sub-line —
 * the identity from the brand reference. All colours come from design tokens.
 */
export function Logo({
  tone = "dark",
  href = "/customer",
  compact = false,
  tagline = false,
  size = "md",
}: {
  tone?: "dark" | "light";
  href?: string;
  /** Mark only, no wordmark. */
  compact?: boolean;
  /** Show the "AT UR POCKET" sub-line (for splash / onboarding / auth). */
  tagline?: boolean;
  size?: "md" | "lg";
}) {
  const big = size === "lg";
  return (
    <Link href={href} className="inline-flex items-center gap-2.5" aria-label="KARIAKOO — at ur pocket">
      <BagMark big={big} />
      {!compact && (
        <span className="leading-none">
          <span className={`block font-extrabold tracking-[0.08em] ${big ? "text-2xl" : "text-lg"} ${tone === "light" ? "text-white" : "text-ink"}`}>
            KARIAKOO
          </span>
          {tagline && (
            <span className={`mt-1 block font-bold uppercase ${big ? "text-[0.62rem] tracking-[0.3em]" : "text-[0.55rem] tracking-[0.22em]"} ${tone === "light" ? "text-gold-300" : "text-brand-700"}`}>
              At ur pocket
            </span>
          )}
        </span>
      )}
    </Link>
  );
}

/** Gold bag-K mark with three delivery "speed" lines on the left. */
function BagMark({ big }: { big: boolean }) {
  return (
    <span aria-hidden="true" className="inline-flex items-center gap-1">
      <span className={`flex flex-col ${big ? "gap-[3px]" : "gap-[2px]"}`}>
        <span className={`rounded-full bg-gold-400 ${big ? "h-[3px] w-2" : "h-[2px] w-1.5"}`} />
        <span className={`rounded-full bg-gold-400 ${big ? "h-[3px] w-3.5" : "h-[2px] w-2.5"}`} />
        <span className={`rounded-full bg-gold-400 ${big ? "h-[3px] w-2" : "h-[2px] w-1.5"}`} />
      </span>
      <span className={`relative grid shrink-0 place-items-center rounded-xl bg-gold-400 font-black text-ink shadow-[inset_0_-3px_0_rgba(0,0,0,0.18)] ${big ? "h-11 w-11 text-xl" : "h-9 w-9 text-base"}`}>
        {/* Bag handle arc over the K. */}
        <svg viewBox="0 0 24 24" className="absolute left-0 top-0 h-full w-full p-1.5 text-ink/55" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <path d="M8.5 8a3.5 3.5 0 0 1 7 0" />
        </svg>
        <span className="mt-[3px] leading-none">K</span>
      </span>
    </span>
  );
}
