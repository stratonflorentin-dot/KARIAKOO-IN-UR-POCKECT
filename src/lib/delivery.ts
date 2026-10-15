// Delivery zones and customer delivery fees. Fees are public prices, so the
// cart can show an estimate; the server recalculates them at checkout using
// this same function and never trusts a fee sent by the browser.
import type { DeliveryZone, DeliveryZoneId } from "@/lib/types";

export const deliveryZones: DeliveryZone[] = [
  { id: "kariakoo", name: "Kariakoo & City Centre", etaLabel: "Same day, 1–3 hrs", feeTzs: 2_000 },
  { id: "ilala", name: "Ilala", etaLabel: "Same day", feeTzs: 3_500 },
  { id: "kinondoni", name: "Kinondoni (Mwenge, Sinza, Mikocheni)", etaLabel: "Same day", feeTzs: 5_000 },
  { id: "ubungo", name: "Ubungo (Mbezi, Kimara)", etaLabel: "Same or next day", feeTzs: 6_000 },
  { id: "temeke", name: "Temeke (Mbagala, Kurasini)", etaLabel: "Same or next day", feeTzs: 6_000 },
  { id: "kigamboni", name: "Kigamboni", etaLabel: "Next day", feeTzs: 8_000 },
];

/** Extra fee for each additional shop the rider must collect from. */
export const EXTRA_PICKUP_FEE_TZS = 1_000;

export function isDeliveryZoneId(value: unknown): value is DeliveryZoneId {
  return typeof value === "string" && deliveryZones.some((z) => z.id === value);
}

export function getZone(id: DeliveryZoneId): DeliveryZone {
  return deliveryZones.find((z) => z.id === id)!;
}

export function deliveryFeeFor(zone: DeliveryZoneId, shopCount: number): number {
  if (!Number.isInteger(shopCount) || shopCount <= 0) return 0;
  return getZone(zone).feeTzs + (shopCount - 1) * EXTRA_PICKUP_FEE_TZS;
}
