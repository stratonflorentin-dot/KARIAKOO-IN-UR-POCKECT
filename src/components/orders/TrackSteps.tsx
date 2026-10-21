"use client";

import { Check } from "lucide-react";
import { useI18n } from "@/i18n/client";
import type { OrderStatus } from "@/lib/types";

// The at-a-glance progress strip on the order page (Confirmed → Packed →
// Out for delivery → Delivered), driven by the order's real status. The
// detailed, timestamped history still lives in the Timeline below it.
const STAGES: { status: OrderStatus; key: "placed" | "confirmed" | "packed" | "out_for_delivery" | "delivered" }[] = [
  { status: "placed", key: "placed" },
  { status: "confirmed", key: "confirmed" },
  { status: "preparing", key: "packed" },
  { status: "out_for_delivery", key: "out_for_delivery" },
  { status: "delivered", key: "delivered" },
];

export function TrackSteps({ status }: { status: OrderStatus }) {
  const { t } = useI18n();
  const tr = t.status.track;

  if (status === "cancelled") {
    return (
      <p className="rounded-2xl bg-red-50 p-3 text-sm font-medium text-red-800" role="status">
        {tr.cancelledNote}
      </p>
    );
  }

  const current = STAGES.findIndex((s) => s.status === status);

  return (
    <ol className="flex items-start justify-between gap-1" aria-label={tr.progressLabel}>
      {STAGES.map((stage, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={stage.status} className="flex flex-1 flex-col items-center gap-1.5 text-center">
            <div className="flex w-full items-center">
              <span className={`h-0.5 flex-1 ${i === 0 ? "opacity-0" : done || active ? "bg-brand-500" : "bg-line"}`} aria-hidden="true" />
              <span
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 text-xs font-bold ${
                  done
                    ? "border-brand-600 bg-brand-600 text-white"
                    : active
                      ? "border-brand-600 bg-white text-brand-700"
                      : "border-line bg-white text-muted"
                }`}
              >
                {done ? <Check size={14} aria-hidden="true" /> : i + 1}
              </span>
              <span className={`h-0.5 flex-1 ${i === STAGES.length - 1 ? "opacity-0" : done ? "bg-brand-500" : "bg-line"}`} aria-hidden="true" />
            </div>
            <span className={`text-[11px] leading-tight ${active ? "font-semibold text-brand-800" : done ? "text-ink" : "text-muted"}`}>
              {tr[stage.key]}
              {active && <span className="sr-only">{tr.currentStep}</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
