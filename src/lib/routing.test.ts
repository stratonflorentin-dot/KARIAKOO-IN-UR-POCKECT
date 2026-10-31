import { describe, expect, it } from "vitest";
import { approximateRoute, routeBetween } from "./routing";

// Kariakoo ~ (-6.8161, 39.2803); a point ~1 km south.
const A = { lat: -6.8161, lng: 39.2803 };
const B = { lat: -6.8251, lng: 39.2803 };

describe("routing fallback", () => {
  it("approximateRoute applies the road factor and a sane duration", () => {
    const r = approximateRoute(A.lat, A.lng, B.lat, B.lng);
    expect(r.approximate).toBe(true);
    // ~1 km straight → ~1.3 km road
    expect(r.distanceM).toBeGreaterThan(1000);
    expect(r.distanceM).toBeLessThan(1600);
    expect(r.durationS).toBeGreaterThanOrEqual(60);
  });

  it("zero-distance still yields a minimum duration, never NaN", () => {
    const r = approximateRoute(A.lat, A.lng, A.lat, A.lng);
    expect(r.distanceM).toBe(0);
    expect(r.durationS).toBe(60);
    expect(Number.isFinite(r.durationS)).toBe(true);
  });

  it("routeBetween falls back to an approximate result when no API key is set", async () => {
    // OPENROUTESERVICE_API_KEY is unset in the test env → no network call.
    const r = await routeBetween(A.lat, A.lng, B.lat, B.lng);
    expect(r.approximate).toBe(true);
    expect(r.distanceM).toBeGreaterThan(1000);
  });
});
