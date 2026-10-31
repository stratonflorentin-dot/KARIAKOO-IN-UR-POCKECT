"use server";

import { getSessionWithRole } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { approximateRoute, routeBetween, type RouteResult } from "@/lib/routing";

const MAX_ROUTED_DISTANCE_M = 30_000;

/** Road ETA from a nearby rider to the customer (keeps the ORS key server-side). */
export async function riderRouteEta(fromLat: number, fromLng: number, toLat: number, toLng: number): Promise<RouteResult> {
  if (
    ![fromLat, fromLng, toLat, toLng].every(Number.isFinite) ||
    fromLat < -90 || fromLat > 90 || toLat < -90 || toLat > 90 ||
    fromLng < -180 || fromLng > 180 || toLng < -180 || toLng > 180
  ) {
    return { distanceM: 0, durationS: 60, approximate: true };
  }

  const estimate = approximateRoute(fromLat, fromLng, toLat, toLng);
  if (estimate.distanceM > MAX_ROUTED_DISTANCE_M || !process.env.OPENROUTESERVICE_API_KEY) return estimate;

  const session = await getSessionWithRole("customer");
  if (!session) return estimate;

  try {
    const sb = await createSupabaseServerClient();
    const { data: allowed, error } = await sb.rpc("consume_routed_eta_quota");
    if (error || allowed !== true) return estimate;
  } catch {
    return estimate;
  }

  return routeBetween(fromLat, fromLng, toLat, toLng);
}
