"use client";

// Online / finish this job then offline / offline. Demo preview: stored on
// this phone and used by the app (job offers), not yet sent to dispatch.
// No location is collected here; GPS sharing is a separate opt-in.
import { ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useAvailability, type Availability } from "@/lib/rider-store";

const options: { id: Availability; label: string; hint: string }[] = [
  { id: "online", label: "Online", hint: "Receive delivery requests" },
  { id: "last-job", label: "Finish this job", hint: "Go offline after your current delivery" },
  { id: "offline", label: "Offline", hint: "No new requests" },
];

const pill: Record<Availability, string> = {
  online: "bg-emerald-600 text-white",
  "last-job": "bg-amber-500 text-ink",
  offline: "bg-white/15 text-white/85",
};

export function AvailabilityToggle() {
  const { availability, setAvailability } = useAvailability();
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const wrap = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.id === availability)!;

  // Close when tapping outside.
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`Availability: ${current.label}`}
        className={`flex h-11 items-center gap-1.5 rounded-full px-4 text-sm font-semibold ${pill[availability]}`}
      >
        <span className={`h-2.5 w-2.5 rounded-full ${availability === "online" ? "bg-white" : availability === "last-job" ? "bg-ink" : "bg-white/50"}`} aria-hidden="true" />
        {current.label}
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      {open && (
        <div id={menuId} role="group" aria-label="Set availability" className="absolute right-0 top-12 z-50 w-64 rounded-2xl bg-white p-2 text-ink shadow-2xl">
          {options.map((o) => (
            <button
              key={o.id}
              type="button"
              aria-pressed={availability === o.id}
              onClick={() => { setAvailability(o.id); setOpen(false); }}
              className={`flex w-full flex-col items-start rounded-xl px-3 py-2.5 text-left ${availability === o.id ? "bg-brand-50" : "hover:bg-subtle"}`}
            >
              <span className="font-semibold">{o.label}</span>
              <span className="text-xs text-muted">{o.hint}</span>
            </button>
          ))}
          <p className="px-3 pb-1 pt-2 text-[11px] text-muted">Preview: saved on this phone, not yet sent to dispatch.</p>
        </div>
      )}
    </div>
  );
}
