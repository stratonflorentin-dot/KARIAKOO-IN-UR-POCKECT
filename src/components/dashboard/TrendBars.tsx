import { formatTzs } from "@/lib/format";

export interface TrendPoint {
  label: string;
  valueTzs: number;
}

/**
 * Single-series bar chart of daily amounts. One hue (brand orange), so the
 * title names the series and no legend is needed. Each bar has a hover /
 * focus tooltip, and the same numbers are available as a table.
 */
export function TrendBars({ title, points, caption }: { title: string; points: TrendPoint[]; caption: string }) {
  const max = Math.max(1, ...points.map((p) => p.valueTzs));
  return (
    <figure>
      <figcaption className="mb-3">
        <span className="block font-semibold text-ink">{title}</span>
        <span className="block text-xs text-muted">{caption}</span>
      </figcaption>
      <div className="flex h-40 items-end gap-[2px] border-b border-line" aria-hidden="true">
        {points.map((p) => (
          <div key={p.label} className="group relative flex h-full flex-1 items-end justify-center">
            <div
              tabIndex={-1}
              className="w-full max-w-10 rounded-t-[4px] bg-brand-500 transition group-hover:bg-brand-700"
              style={{ height: `${p.valueTzs === 0 ? 0 : Math.max(2, (p.valueTzs / max) * 100)}%` }}
            />
            <span className="pointer-events-none absolute bottom-full mb-1 hidden whitespace-nowrap rounded-lg bg-ink px-2 py-1 text-xs text-white group-hover:block">
              {p.label}: {formatTzs(p.valueTzs)}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-[2px] text-center text-[11px] text-muted" aria-hidden="true">
        {points.map((p) => <span key={p.label} className="flex-1 truncate">{p.label}</span>)}
      </div>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-xs font-medium text-brand-700">Show as table</summary>
        <table className="mt-2 w-full text-left text-xs">
          <thead><tr><th scope="col" className="py-1 font-semibold">Day</th><th scope="col" className="py-1 text-right font-semibold">Amount</th></tr></thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.label} className="border-t border-line"><td className="py-1">{p.label}</td><td className="py-1 text-right tabular-nums">{formatTzs(p.valueTzs)}</td></tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

/** Sum amounts per day for the 7 days ending on `endDate` (YYYY-MM-DD, Dar es Salaam time). */
export function lastSevenDays(entries: { at: string; amountTzs: number }[], endDate: string): TrendPoint[] {
  const end = new Date(`${endDate}T12:00:00+03:00`);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(end.getTime() - (6 - i) * 86_400_000);
    return d.toISOString().slice(0, 10);
  });
  const dayOf = (iso: string) => new Date(new Date(iso).getTime() + 3 * 3_600_000).toISOString().slice(0, 10);
  return days.map((day) => ({
    label: new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${day}T00:00:00Z`)),
    valueTzs: entries.filter((e) => dayOf(e.at) === day).reduce((s, e) => s + e.amountTzs, 0),
  }));
}
