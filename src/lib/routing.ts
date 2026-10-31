// Road distance + travel time between two points. Uses OpenRouteService's
// directions API when OPENROUTESERVICE_API_KEY is set (server-only), and falls
// back to a haversine × road-factor estimate — flagged `approximate` — when the
// key is missing, the request fails, or it times out. The key is read from the
// server environment only and is never exposed to the browser (callers are
// server actions / route handlers).

export interface RouteResult {
  distanceM: number;
  durationS: number;
  approximate: boolean;
}

const ROAD_FACTOR = 1.3; // straight-line → road distance
const AVG_SPEED_MS = (20 * 1000) / 3600; // ~20 km/h city average (boda)

function haversineM(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6_371_000;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** Haversine × road-factor estimate; always `approximate: true`. */
export function approximateRoute(aLat: number, aLng: number, bLat: number, bLng: number): RouteResult {
  const distanceM = Math.round(haversineM(aLat, aLng, bLat, bLng) * ROAD_FACTOR);
  return { distanceM, durationS: Math.max(60, Math.round(distanceM / AVG_SPEED_MS)), approximate: true };
}

/**
 * Road route between two points. Returns the ORS result when available, else an
 * approximate fallback. Never throws — on any failure it degrades to the estimate.
 */
export async function routeBetween(aLat: number, aLng: number, bLat: number, bLng: number): Promise<RouteResult> {
  const key = process.env.OPENROUTESERVICE_API_KEY;
  if (!key) return approximateRoute(aLat, aLng, bLat, bLng);
  try {
    // Hosted ORS has no motorcycle profile; driving-car is the closest proxy for a
    // boda's road routing (self-host ORS for a true motorcycle profile).
    const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${encodeURIComponent(key)}&start=${aLng},${aLat}&end=${bLng},${bLat}`;
    const res = await fetch(url, { headers: { Accept: "application/geo+json" }, signal: AbortSignal.timeout(5000) });
    if (!res.ok) return approximateRoute(aLat, aLng, bLat, bLng);
    const json = (await res.json()) as { features?: { properties?: { summary?: { distance?: number; duration?: number } } }[] };
    const summary = json?.features?.[0]?.properties?.summary;
    const distanceM = Number(summary?.distance);
    const durationS = Number(summary?.duration);
    if (!Number.isFinite(distanceM) || !Number.isFinite(durationS) || distanceM <= 0) {
      return approximateRoute(aLat, aLng, bLat, bLng);
    }
    return { distanceM: Math.round(distanceM), durationS: Math.round(durationS), approximate: false };
  } catch {
    return approximateRoute(aLat, aLng, bLat, bLng);
  }
}
