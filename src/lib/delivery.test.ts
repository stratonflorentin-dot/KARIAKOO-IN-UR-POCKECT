import { describe, expect, it } from "vitest";
import {
  deliveryFeeFor,
  deliveryFeeForDropoff,
  distanceKmBetween,
  getDistanceKmFromKariakoo,
  getZoneFromCoordinates,
  isDeliveryZoneId,
  ZONE_CENTERS,
} from "./delivery";

describe("deliveryFeeFor", () => {
  it("charges the zone fee for a single-shop order", () => {
    expect(deliveryFeeFor("kariakoo", 1)).toBe(2_000);
    expect(deliveryFeeFor("kigamboni", 1)).toBe(8_000);
  });

  it("adds TSh 1,000 per extra shop", () => {
    expect(deliveryFeeFor("ilala", 3)).toBe(3_500 + 2_000);
  });

  it("charges nothing for an empty order", () => {
    expect(deliveryFeeFor("ilala", 0)).toBe(0);
  });

  it("validates zone ids", () => {
    expect(isDeliveryZoneId("temeke")).toBe(true);
    expect(isDeliveryZoneId("nairobi")).toBe(false);
  });

  it("correctly identifies closest delivery zone and fee based on drop point coordinates", () => {
    // Kariakoo market coordinates
    expect(getZoneFromCoordinates(39.2778, -6.8188)).toBe("kariakoo");
    // Kinondoni/Mwenge area
    expect(getZoneFromCoordinates(39.238, -6.772)).toBe("kinondoni");
    // Kigamboni area
    expect(getZoneFromCoordinates(39.315, -6.84)).toBe("kigamboni");

    const dropoffResult = deliveryFeeForDropoff([39.238, -6.772], "kariakoo", 1);
    expect(dropoffResult.zone).toBe("kinondoni");
    expect(dropoffResult.feeTzs).toBe(5_000);
    expect(dropoffResult.distanceKm).toBeGreaterThan(4);
  });

  it("calculates distance from Kariakoo accurately", () => {
    const km = getDistanceKmFromKariakoo(ZONE_CENTERS.kariakoo.lng, ZONE_CENTERS.kariakoo.lat);
    expect(km).toBeCloseTo(0, 1);

    const distToKinondoni = distanceKmBetween(ZONE_CENTERS.kariakoo, ZONE_CENTERS.kinondoni);
    expect(distToKinondoni).toBeGreaterThan(5);
    expect(distToKinondoni).toBeLessThan(12);
  });
});
