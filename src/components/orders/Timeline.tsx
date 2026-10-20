import { Check } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import type { StatusEvent } from "@/lib/types";

const actorLabel: Record<StatusEvent["actor"], string> = {
  customer: "You",
  seller: "Shop",
  rider: "Rider",
  admin: "KARIAKOO",
  system: "System",
};

/**
 * Honest status history: recorded events (green checks + timestamps) followed
 * by the not-yet-reached steps (hollow). No simulated live tracking.
 */
export function Timeline({ events, upcoming = [] }: { events: StatusEvent[]; upcoming?: string[] }) {
  const items = [
    ...events.map((e) => ({ done: true, label: e.label, meta: `${formatDateTime(e.at)} · ${actorLabel[e.actor]}` })),
    ...upcoming.map((label) => ({ done: false, label, meta: "Not yet" })),
  ];

  return (
    <ol>
      {items.map((item, i) => {
        const last = i === items.length - 1;
        return (
          <li key={`${i}-${item.label}`} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                aria-hidden="true"
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 ${
                  item.done ? "border-brand-600 bg-brand-600 text-white" : "border-line bg-white"
                }`}
              >
                {item.done && <Check size={15} />}
              </span>
              {!last && <span aria-hidden="true" className={`w-0.5 flex-1 ${item.done ? "bg-brand-500" : "bg-line"}`} />}
            </div>
            <div className={`pt-0.5 ${last ? "" : "pb-6"}`}>
              <p className={`text-sm font-medium ${item.done ? "text-ink" : "text-muted"}`}>{item.label}</p>
              <p className={`text-xs ${item.done ? "text-muted" : "text-stone-400"}`}>{item.meta}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
