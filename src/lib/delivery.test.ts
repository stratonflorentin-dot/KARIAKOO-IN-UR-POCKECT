import { describe, expect, it } from "vitest";
import { deliveryFeeFor, isDeliveryZoneId } from "./delivery";

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
});
