"use client";

import { useAvailability } from "@/lib/rider-store";

/** Reminds the rider why no requests are arriving. */
export function AvailabilityBanner() {
  const { availability, setAvailability } = useAvailability();
  if (availability === "online") return null;
  return (
    <div role="status" className={`flex items-center justify-between gap-3 rounded-2xl p-3 text-sm ${availability === "offline" ? "bg-stone-200 text-ink" : "bg-amber-100 text-amber-950"}`}>
      <span>
        {availability === "offline"
          ? "You're offline. You won't get new delivery requests."
          : "You'll go offline after your current delivery. No new requests until then."}
      </span>
      <button type="button" onClick={() => setAvailability("online")} className="h-10 shrink-0 rounded-full bg-emerald-600 px-4 font-semibold text-white">
        Go online
      </button>
    </div>
  );
}
