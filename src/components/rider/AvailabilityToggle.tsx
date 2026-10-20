"use client";

import { useState } from "react";
import { setRiderPresence } from "@/app/rider/actions";

export function AvailabilityToggle({ initialOnline }: { initialOnline: boolean }) {
  const [online, setOnline] = useState(initialOnline);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function toggle() {
    setPending(true);
    setMessage("");
    const result = await setRiderPresence(!online);
    setPending(false);
    if (!result.ok) return setMessage(result.message);
    setOnline(!online);
    setMessage(!online ? "You are available for delivery requests." : "You are offline.");
  }

  return <div>
    <button type="button" onClick={toggle} disabled={pending} aria-pressed={online} className={`flex h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold disabled:opacity-60 ${online ? "bg-emerald-600 text-white" : "bg-white/15 text-white/85"}`}>
      <span className={`h-2.5 w-2.5 rounded-full ${online ? "bg-white" : "bg-white/50"}`} aria-hidden="true" />
      {pending ? "Saving…" : online ? "Online" : "Offline"}
    </button>
    <span role="status" aria-live="polite" className="sr-only">{message}</span>
  </div>;
}
