import { formatDateTime } from "@/lib/format";
import type { StatusEvent } from "@/lib/types";

const actorLabel: Record<StatusEvent["actor"], string> = {
  customer: "You",
  seller: "Shop",
  rider: "Rider",
  admin: "KARIAKOO",
  system: "System",
};

/** Honest status history: recorded events only, no simulated live tracking. */
export function Timeline({ events, upcoming = [] }: { events: StatusEvent[]; upcoming?: string[] }) {
  return (
    <ol className="relative space-y-4 border-l-2 border-line pl-6">
      {events.map((e, i) => (
        <li key={`${e.at}-${i}`} className="relative">
          <span aria-hidden="true" className="absolute -left-[31px] top-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-brand-600 ring-2 ring-brand-200" />
          <p className="text-sm font-medium text-ink">{e.label}</p>
          <p className="text-xs text-muted">
            {formatDateTime(e.at)} · {actorLabel[e.actor]}
          </p>
        </li>
      ))}
      {upcoming.map((label) => (
        <li key={label} className="relative">
          <span aria-hidden="true" className="absolute -left-[31px] top-1 h-3.5 w-3.5 rounded-full border-2 border-line bg-white" />
          <p className="text-sm text-muted">{label}</p>
          <p className="text-xs text-stone-400">Not yet</p>
        </li>
      ))}
    </ol>
  );
}
