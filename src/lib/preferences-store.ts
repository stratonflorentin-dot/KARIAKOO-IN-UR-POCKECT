"use client";

// Per-device conveniences: chosen delivery area and recently viewed products.
import { useCallback, useSyncExternalStore } from "react";
import { isDeliveryZoneId } from "@/lib/delivery";
import { createLocalStore } from "@/lib/local-store";
import type { DeliveryZoneId } from "@/lib/types";

const zoneStore = createLocalStore<DeliveryZoneId>("kariakoo-zone-v1", "kariakoo", (raw) =>
  isDeliveryZoneId(raw) ? raw : "kariakoo",
);

export function useDeliveryZone() {
  const zone = useSyncExternalStore(zoneStore.subscribe, zoneStore.get, zoneStore.getServer);
  const setZone = useCallback((z: DeliveryZoneId) => zoneStore.set(z), []);
  return { zone, setZone };
}

const MAX_RECENT = 8;
const recentStore = createLocalStore<string[]>("kariakoo-recent-v1", [], (raw) =>
  Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string").slice(0, MAX_RECENT) : [],
);

export function useRecentlyViewed() {
  return useSyncExternalStore(recentStore.subscribe, recentStore.get, recentStore.getServer);
}

export function recordRecentlyViewed(productId: string) {
  const next = [productId, ...recentStore.get().filter((id) => id !== productId)].slice(0, MAX_RECENT);
  recentStore.set(next);
}
