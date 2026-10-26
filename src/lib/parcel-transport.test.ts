import { describe, expect, it } from "vitest";
import {
  GROUND_TRANSPORT_VEHICLES,
  calculateBoltTripPrice,
} from "./parcel-transport";

describe("Ground Parcel Transport & Bolt Tanzania Trip Pricing", () => {
  it("defines all 4 key ground cargo transport vehicles from Kariakoo logistics", () => {
    expect(GROUND_TRANSPORT_VEHICLES).toHaveLength(4);
    const ids = GROUND_TRANSPORT_VEHICLES.map((v) => v.id);
    expect(ids).toContain("pikipiki");
    expect(ids).toContain("bajaji");
    expect(ids).toContain("pickup");
    expect(ids).toContain("lori_dogo");
  });

  it("has Bolt Tanzania tariffs assigned to each vehicle category", () => {
    for (const v of GROUND_TRANSPORT_VEHICLES) {
      expect(v.tariff).toBeDefined();
      expect(v.tariff.baseFareTzs).toBeGreaterThan(0);
      expect(v.tariff.perKmRateTzs).toBeGreaterThan(0);
      expect(v.tariff.perMinuteRateTzs).toBeGreaterThan(0);
      expect(v.tariff.minimumFareTzs).toBeGreaterThan(0);
    }
  });

  it("calculates Bolt trip price accurately: Base + (km * rate) + (min * rate) + 3.5% fee", () => {
    // 10 km, 25 minutes on Pikipiki
    // Base: 1,200
    // Distance: 10 * 450 = 4,500
    // Time: 25 * 60 = 1,500
    // Subtotal: 1,200 + 4,500 + 1,500 = 7,200
    // Booking fee (3.5%): 252
    // Total: 7,200 + 252 = 7,452
    const trip = calculateBoltTripPrice("pikipiki", 10, 25, 1.0);
    expect(trip.baseFareTzs).toBe(1_200);
    expect(trip.distanceFareTzs).toBe(4_500);
    expect(trip.timeFareTzs).toBe(1_500);
    expect(trip.subtotalTzs).toBe(7_200);
    expect(trip.bookingFeeTzs).toBe(Math.round(7_200 * 0.035));
    expect(trip.totalFareTzs).toBe(trip.subtotalTzs + trip.bookingFeeTzs);
  });

  it("applies minimum fare for very short trips under minimum threshold", () => {
    // Very short trip: 0.2 km, 2 min on Lori Dogo
    // Raw sum would be 9,000 + 320 + 400 = 9,720
    // But Lori Dogo minimum fare is 22,000 TZS
    const shortTrip = calculateBoltTripPrice("lori_dogo", 0.2, 2, 1.0);
    expect(shortTrip.isMinimumFareApplied).toBe(true);
    expect(shortTrip.subtotalTzs).toBe(22_000);
    expect(shortTrip.totalFareTzs).toBe(22_000 + Math.round(22_000 * 0.035));
  });

  it("applies dynamic surge multiplier during peak demand", () => {
    const normal = calculateBoltTripPrice("bajaji", 10, 25, 1.0);
    const surge = calculateBoltTripPrice("bajaji", 10, 25, 1.4); // 40% surge
    expect(surge.totalFareTzs).toBeGreaterThan(normal.totalFareTzs);
  });

  it("calculates rates correctly with multi-shop pickup", () => {
    const multiShop = calculateBoltTripPrice("pickup", 10, 25, 1.0, 3);
    const singleShop = calculateBoltTripPrice("pickup", 10, 25, 1.0, 1);
    expect(multiShop.totalFareTzs).toBeGreaterThan(singleShop.totalFareTzs);
  });
});
