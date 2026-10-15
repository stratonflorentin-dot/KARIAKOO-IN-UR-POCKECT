"use client";

import { useState } from "react";

/**
 * Online/offline switch. Demo preview: the state is local to this page and
 * not sent to dispatch. No location is collected; GPS sharing will be a
 * separate, explicit opt-in with privacy controls.
 */
export function AvailabilityToggle() {
  const [online, setOnline] = useState(true);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={online}
      onClick={() => setOnline((o) => !o)}
      className={`flex h-11 items-center gap-2 rounded-full pl-3 pr-1.5 text-sm font-semibold transition ${online ? "bg-emerald-600 text-white" : "bg-white/15 text-white/80"}`}
    >
      {online ? "Online" : "Offline"}
      <span className={`h-8 w-8 rounded-full bg-white transition ${online ? "" : "opacity-60"}`} aria-hidden="true" />
      <span className="sr-only"> (preview only, not sent to dispatch)</span>
    </button>
  );
}
