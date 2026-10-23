"use client";

import { Phone, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { reportSosIncident } from "@/app/[lang]/rider/actions";

const EMERGENCY = [
  { label: "Police", number: "112" },
  { label: "Ambulance", number: "115" },
  { label: "Fire", number: "114" },
];

type SosState = "idle" | "sending" | "sent" | "error";

/** Emergency call links + a database-backed SOS alert to dispatch. */
export function SafetyButton() {
  const [state, setState] = useState<SosState>("idle");
  const [message, setMessage] = useState("");

  function sendSos() {
    setState("sending");
    const send = (lat?: number, lng?: number) =>
      reportSosIncident(lat, lng).then((r) => {
        setState(r.ok ? "sent" : "error");
        setMessage(r.message ?? "");
      });
    // Attach the rider's location when it's available, but never block on it.
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => send(pos.coords.latitude, pos.coords.longitude),
        () => send(),
        { timeout: 5000, maximumAge: 60_000 },
      );
    } else {
      send();
    }
  }

  return (
    <details className="relative">
      <summary className="flex h-11 cursor-pointer list-none items-center gap-1.5 rounded-full bg-red-600 px-3 text-sm font-bold text-white">
        <ShieldAlert size={18} aria-hidden="true" /> SOS
      </summary>
      <div className="absolute right-0 top-12 z-50 w-64 rounded-2xl bg-white p-3 text-ink shadow-2xl">
        <p className="text-sm font-semibold">Emergency services</p>
        <ul className="mt-2 space-y-1">
          {EMERGENCY.map((e) => (
            <li key={e.number}>
              <a className="flex min-h-11 items-center justify-between rounded-lg px-2 hover:bg-subtle" href={`tel:${e.number}`}>
                <span>{e.label}</span>
                <span className="flex items-center gap-1 font-bold"><Phone size={14} />{e.number}</span>
              </a>
            </li>
          ))}
        </ul>
        <div className="mt-3 border-t border-line pt-3">
          <button
            type="button"
            onClick={sendSos}
            disabled={state === "sending" || state === "sent"}
            className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg bg-red-600 px-3 text-sm font-bold text-white disabled:opacity-70"
          >
            <ShieldAlert size={15} aria-hidden="true" />
            {state === "sending" ? "Sending alert…" : state === "sent" ? "Alert sent ✓" : "Send SOS alert to dispatch"}
          </button>
          {message && (
            <p role="status" aria-live="polite" className={`mt-2 text-xs ${state === "error" ? "text-red-700" : "text-emerald-700"}`}>
              {message}
            </p>
          )}
        </div>
      </div>
    </details>
  );
}
