"use server";

import { routeBetween, type RouteResult } from "@/lib/routing";

/** Road ETA from a nearby rider to the customer (keeps the ORS key server-side). */
export async function riderRouteEta(fromLat: number, fromLng: number, toLat: number, toLng: number): Promise<RouteResult> {
  if (![fromLat, fromLng, toLat, toLng].every((n) => Number.isFinite(n))) {
    return { distanceM: 0, durationS: 60, approximate: true };
  }
  return routeBetween(fromLat, fromLng, toLat, toLng);
}
