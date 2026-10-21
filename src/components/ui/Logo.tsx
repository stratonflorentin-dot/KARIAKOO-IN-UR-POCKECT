import Link from "next/link";

type LogoSize = "md" | "lg" | "xl";

/**
 * KARIAKOO brand lockup. A gold shopping-bag "K" mark (with delivery speed
 * lines) next to the wordmark, optionally over the "AT UR POCKET" sub-line —
 * the identity from the brand reference. `xl` stacks it centred for the
 * splash screen. All colours come from design tokens.
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
  size?: LogoSize;
}) {
  const xl = size === "xl";
  const word = { md: "text-lg", lg: "text-2xl", xl: "text-5xl" }[size];
  const sub = { md: "text-[0.55rem] tracking-[0.22em]", lg: "text-[0.62rem] tracking-[0.3em]", xl: "text-base tracking-[0.32em]" }[size];
  return (
    <Link
      href={href}
      className={xl ? "inline-flex flex-col items-center gap-4 text-center" : "inline-flex items-center gap-2.5"}
      aria-label="KARIAKOO — at ur pocket"
    >
      <BagMark size={size} />
      {!compact && (
        <span className="leading-none">
          <span className={`block font-extrabold tracking-[0.08em] ${word} ${tone === "light" ? "text-white" : "text-ink"}`}>KARIAKOO</span>
          {tagline && (
            <span className={`block font-bold uppercase ${xl ? "mt-2" : "mt-1"} ${sub} ${tone === "light" ? "text-gold-400" : "text-brand-700"}`}>
              At ur pocket
            </span>
          )}
        </span>
      )}
    </Link>
  );
}

/** Gold bag-K mark with three delivery "speed" lines on the left. */
function BagMark({ size }: { size: LogoSize }) {
  const tile = { md: "h-9 w-9 text-base rounded-xl", lg: "h-11 w-11 text-xl rounded-xl", xl: "h-20 w-20 text-4xl rounded-3xl" }[size];
  const line = { md: ["h-[2px] w-1.5", "h-[2px] w-2.5"], lg: ["h-[3px] w-2", "h-[3px] w-3.5"], xl: ["h-1 w-4", "h-1 w-6"] }[size];
  const gap = { md: "gap-[2px]", lg: "gap-[3px]", xl: "gap-1.5" }[size];
  return (
    <span aria-hidden="true" className={`inline-flex items-center ${size === "xl" ? "gap-2" : "gap-1"}`}>
      <span className={`flex flex-col ${gap}`}>
        <span className={`rounded-full bg-gold-400 ${line[0]}`} />
        <span className={`rounded-full bg-gold-400 ${line[1]}`} />
        <span className={`rounded-full bg-gold-400 ${line[0]}`} />
      </span>
      <span className={`relative grid shrink-0 place-items-center bg-gold-400 font-black text-ink shadow-[inset_0_-3px_0_rgba(0,0,0,0.18)] ${tile}`}>
        {/* Bag handle arc over the K. */}
        <svg viewBox="0 0 24 24" className="absolute left-0 top-0 h-full w-full p-1.5 text-ink/55" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <path d="M8.5 8a3.5 3.5 0 0 1 7 0" />
        </svg>
        <span className={`leading-none ${size === "xl" ? "mt-[24%]" : "mt-[12%]"}`}>K</span>
      </span>
    </span>
  );
}
