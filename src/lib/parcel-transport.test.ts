import { describe, expect, it } from "vitest";
import {
  GROUND_TRANSPORT_VEHICLES,
  calculateParcelRate,
  getVehicleById,
  type GroundTransportVehicleId,
} from "./parcel-transport";

describe("Ground Parcel Transport logic", () => {
  it("defines all 4 key ground cargo transport vehicles from Kariakoo logistics", () => {
    expect(GROUND_TRANSPORT_VEHICLES).toHaveLength(4);
    const ids = GROUND_TRANSPORT_VEHICLES.map((v) => v.id);
    expect(ids).toContain("pikipiki");
    expect(ids).toContain("bajaji");
    expect(ids).toContain("pickup");
    expect(ids).toContain("lori_dogo");
  });

  it("returns correct base rates matching official ground transport scale", () => {
    expect(getVehicleById("pikipiki").baseRateTzs).toBe(11_500);
    expect(getVehicleById("bajaji").baseRateTzs).toBe(17_000);
    expect(getVehicleById("pickup").baseRateTzs).toBe(21_000);
    expect(getVehicleById("lori_dogo").baseRateTzs).toBe(31_000);
  });

  it("calculates rates correctly with zone multipliers and multi-shop pickup", () => {
    // 1 shop base in central zone
    const basePikipiki = calculateParcelRate("pikipiki", 1.0, 1);
    expect(basePikipiki).toBe(11_500);

    // Multi-shop pickup adds extra pickup fee
    const multiShopPickup = calculateParcelRate("pickup", 1.0, 3);
    expect(multiShopPickup).toBe(21_000 + 4_000); // 21,000 + 2 extra shops * 2,000

    // Distant zone multiplier
    const kigamboniTruck = calculateParcelRate("lori_dogo", 1.5, 1);
    expect(kigamboniTruck).toBe(Math.round(31_000 * 1.5));
  });

  it("falls back gracefully for unknown vehicle IDs", () => {
    const fallback = getVehicleById("unknown" as GroundTransportVehicleId);
    expect(fallback).toBeDefined();
    expect(fallback.id).toBe("pickup");
  });
});
