"use client";

import { Phone, ShieldAlert } from "lucide-react";

const EMERGENCY = [
  { label: "Police", number: "112" },
  { label: "Ambulance", number: "115" },
  { label: "Fire", number: "114" },
];

/** Immediate emergency call links only; incident reporting requires a live dispatch endpoint. */
export function SafetyButton() {
  return <details className="relative">
    <summary className="flex h-11 cursor-pointer list-none items-center gap-1.5 rounded-full bg-red-600 px-3 text-sm font-bold text-white"><ShieldAlert size={18} aria-hidden="true" /> SOS</summary>
    <div className="absolute right-0 top-12 z-50 w-56 rounded-2xl bg-white p-3 text-ink shadow-2xl">
      <p className="text-sm font-semibold">Emergency services</p>
      <ul className="mt-2 space-y-1">{EMERGENCY.map((e) => <li key={e.number}><a className="flex min-h-11 items-center justify-between rounded-lg px-2 hover:bg-subtle" href={`tel:${e.number}`}><span>{e.label}</span><span className="flex items-center gap-1 font-bold"><Phone size={14} />{e.number}</span></a></li>)}</ul>
    </div>
  </details>;
}
