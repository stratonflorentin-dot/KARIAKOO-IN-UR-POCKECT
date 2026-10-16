"use client";

// Rider availability on this phone: online, finishing the current job then
// going offline, or offline. Demo preview: it controls what this app shows
// (e.g. job offers) and is not yet sent to dispatch (Phase 6).
import { useCallback, useSyncExternalStore } from "react";
import { createLocalStore } from "@/lib/local-store";

export type Availability = "online" | "last-job" | "offline";

const store = createLocalStore<Availability>("kariakoo-rider-availability-v1", "online", (raw) =>
  raw === "online" || raw === "last-job" || raw === "offline" ? raw : "online",
);

export function useAvailability() {
  const availability = useSyncExternalStore(store.subscribe, store.get, store.getServer);
  const setAvailability = useCallback((a: Availability) => store.set(a), []);
  return { availability, setAvailability };
}

/** Called when a delivery completes: "finish this job" riders go offline. */
export function afterDeliveryCompleted(): Availability {
  const current = store.get();
  if (current === "last-job") {
    store.set("offline");
    return "offline";
  }
  return current;
}
