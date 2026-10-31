import { formatTzs } from "@/lib/format";

export function Price({
  amount,
  compareAt,
  size = "md",
  tone = "default",
}: {
  amount: number;
  compareAt?: number;
  size?: "md" | "lg";
  tone?: "default" | "inverse";
}) {
  const discounted = compareAt !== undefined && compareAt > amount;
  return (
    <p className="flex flex-wrap items-baseline gap-x-2">
      <span className={`font-bold ${tone === "inverse" ? "text-white" : "text-ink"} ${size === "lg" ? "text-3xl" : "text-base"}`}>
        {formatTzs(amount)}
      </span>
      {discounted && (
        <>
          <span className="sr-only">, was </span>
          <s className={`text-muted ${tone === "inverse" ? "text-white/70" : ""} ${size === "lg" ? "text-base" : "text-xs"}`}>{formatTzs(compareAt)}</s>
          <span className={`rounded px-1.5 text-xs font-semibold ${tone === "inverse" ? "bg-gold-400 text-ink" : "bg-brand-50 text-brand-700"}`}>
            −{Math.round((1 - amount / compareAt) * 100)}%
          </span>
        </>
      )}
    </p>
  );
}
