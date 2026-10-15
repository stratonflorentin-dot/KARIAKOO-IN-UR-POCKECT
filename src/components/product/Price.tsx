import { formatTzs } from "@/lib/format";

export function Price({
  amount,
  compareAt,
  size = "md",
}: {
  amount: number;
  compareAt?: number;
  size?: "md" | "lg";
}) {
  const discounted = compareAt !== undefined && compareAt > amount;
  return (
    <p className="flex flex-wrap items-baseline gap-x-2">
      <span className={`font-bold text-ink ${size === "lg" ? "text-3xl" : "text-base"}`}>
        {formatTzs(amount)}
      </span>
      {discounted && (
        <>
          <span className="sr-only">, was </span>
          <s className={`text-muted ${size === "lg" ? "text-base" : "text-xs"}`}>{formatTzs(compareAt)}</s>
          <span className="rounded bg-brand-50 px-1.5 text-xs font-semibold text-brand-700">
            −{Math.round((1 - amount / compareAt) * 100)}%
          </span>
        </>
      )}
    </p>
  );
}
