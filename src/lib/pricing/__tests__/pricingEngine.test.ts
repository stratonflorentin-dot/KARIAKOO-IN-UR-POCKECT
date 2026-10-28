import { describe, expect, it } from "vitest";
import {
  calculateCancellationFee,
  calculateDistance,
  calculateMarketplaceSplits,
  clampSurge,
  DEFAULT_PRICING_CONFIG,
  estimateDeliveryFare,
  SURGE_MAX,
  SURGE_MIN,
} from "../pricingEngine";

const cfg = DEFAULT_PRICING_CONFIG;

describe("calculateDistance (Haversine)", () => {
  it("is zero between a point and itself", () => {
    expect(calculateDistance(-6.8188, 39.2778, -6.8188, 39.2778)).toBe(0);
  });
  it("is ~111 km for one degree of latitude", () => {
    expect(calculateDistance(0, 0, 1, 0)).toBeCloseTo(111.19, 0);
  });
});

describe("clampSurge", () => {
  it("defaults to 1.0 and clamps to the band", () => {
    expect(clampSurge(undefined)).toBe(SURGE_MIN);
    expect(clampSurge(0.5)).toBe(SURGE_MIN);
    expect(clampSurge(3.0)).toBe(SURGE_MAX);
    expect(clampSurge(1.8)).toBe(1.8);
    expect(clampSurge(Number.NaN)).toBe(SURGE_MIN);
  });
});

describe("estimateDeliveryFare", () => {
  it("computes a normal fare (base + distance + time)", () => {
    const f = estimateDeliveryFare({ distanceKm: 5, durationMins: 20, config: cfg });
    expect(f.distanceTzs).toBe(2_000); // 400 * 5
    expect(f.timeTzs).toBe(1_000); // 50 * 20
    expect(f.subtotalTzs).toBe(4_500); // 1500 + 2000 + 1000
    expect(f.minimumApplied).toBe(false);
    expect(f.surgeApplied).toBe(false);
    expect(f.deliveryFeeTzs).toBe(4_500);
  });

  it("applies the minimum fare floor on short trips", () => {
    const f = estimateDeliveryFare({ distanceKm: 0.5, durationMins: 2, config: cfg });
    expect(f.subtotalTzs).toBe(1_800); // 1500 + 200 + 100
    expect(f.minimumApplied).toBe(true);
    expect(f.deliveryFeeTzs).toBe(2_000); // floored
  });

  it("applies and clamps the surge multiplier", () => {
    const f = estimateDeliveryFare({ distanceKm: 5, durationMins: 20, config: cfg, surgeMultiplier: 2 });
    expect(f.deliveryFeeTzs).toBe(9_000); // 4500 * 2
    expect(f.surgeApplied).toBe(true);
    const capped = estimateDeliveryFare({ distanceKm: 5, durationMins: 20, config: cfg, surgeMultiplier: 5 });
    expect(capped.surgeMultiplier).toBe(SURGE_MAX);
    expect(capped.deliveryFeeTzs).toBe(11_250); // 4500 * 2.5
  });

  it("charges paid waiting only after the free window", () => {
    const f = estimateDeliveryFare({ distanceKm: 5, durationMins: 20, config: cfg, waitingMins: 8 });
    expect(f.waitingTzs).toBe(500); // (8 - 3) * 100
    expect(f.deliveryFeeTzs).toBe(5_000);
    const within = estimateDeliveryFare({ distanceKm: 5, durationMins: 20, config: cfg, waitingMins: 3 });
    expect(within.waitingTzs).toBe(0);
  });

  it("adds extra-pickup fees for multi-shop orders", () => {
    const f = estimateDeliveryFare({ distanceKm: 5, durationMins: 20, config: cfg, extraPickups: 2 });
    expect(f.extraPickupsTzs).toBe(2_000);
    expect(f.deliveryFeeTzs).toBe(6_500);
  });

  it("rejects negative inputs", () => {
    expect(() => estimateDeliveryFare({ distanceKm: -1, durationMins: 10, config: cfg })).toThrow();
  });
});

describe("calculateMarketplaceSplits", () => {
  it("splits an order between platform, seller and rider", () => {
    const s = calculateMarketplaceSplits({ itemSubtotalTzs: 20_000, deliveryFeeTzs: 4_500, config: cfg });
    expect(s.sellerCommissionTzs).toBe(2_000); // 10% of 20000
    expect(s.riderCommissionTzs).toBe(675); // 15% of 4500
    expect(s.platformCommissionTzs).toBe(2_675);
    expect(s.sellerNetPayoutTzs).toBe(18_000);
    expect(s.riderNetEarningsTzs).toBe(3_825);
    expect(s.customerTotalTzs).toBe(25_000); // 20000 + 4500 + 500 booking
  });

  it("applies discounts and tips", () => {
    const s = calculateMarketplaceSplits({
      itemSubtotalTzs: 20_000,
      deliveryFeeTzs: 4_500,
      config: cfg,
      discountTzs: 2_000,
      tipsTzs: 1_000,
    });
    expect(s.customerTotalTzs).toBe(23_000); // 20000 + 4500 + 500 - 2000
    expect(s.riderNetEarningsTzs).toBe(4_825); // 3825 + 1000 tip
  });

  it("never lets the customer total go negative", () => {
    const s = calculateMarketplaceSplits({ itemSubtotalTzs: 1_000, deliveryFeeTzs: 0, config: cfg, discountTzs: 99_999 });
    expect(s.customerTotalTzs).toBe(0);
  });
});

describe("calculateCancellationFee", () => {
  it("is free within the grace window", () => {
    expect(calculateCancellationFee(2, cfg)).toBe(0);
    expect(calculateCancellationFee(3, cfg)).toBe(0);
  });
  it("charges the flat fee past the grace window", () => {
    expect(calculateCancellationFee(5, cfg)).toBe(1_000);
  });
});
