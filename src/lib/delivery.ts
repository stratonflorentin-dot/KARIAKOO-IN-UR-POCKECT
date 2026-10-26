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

/**
 * Great-circle distance between two GPS coordinates in kilometres (Haversine formula).
 */
export function distanceKmBetween(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const aVal =
    sinLat * sinLat +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      sinLng *
      sinLng;
  const c = 2 * Math.atan2(Math.sqrt(aVal), Math.sqrt(1 - aVal));
  return R * c;
}

/**
 * Geographic focal points for Dar es Salaam delivery zones.
 */
export const ZONE_CENTERS: Record<DeliveryZoneId, { lat: number; lng: number }> = {
  kariakoo: { lat: -6.8188, lng: 39.2778 },
  ilala: { lat: -6.828, lng: 39.255 },
  kinondoni: { lat: -6.772, lng: 39.238 },
  ubungo: { lat: -6.782, lng: 39.195 },
  temeke: { lat: -6.865, lng: 39.26 },
  kigamboni: { lat: -6.84, lng: 39.315 },
};

/**
 * Automatically determines the closest delivery zone in Dar es Salaam based on drop point coordinates [lng, lat].
 */
export function getZoneFromCoordinates(lng: number, lat: number): DeliveryZoneId {
  let closestZone: DeliveryZoneId = "kariakoo";
  let minDistance = Infinity;

  for (const [id, center] of Object.entries(ZONE_CENTERS)) {
    const dist = distanceKmBetween({ lat, lng }, center);
    if (dist < minDistance) {
      minDistance = dist;
      closestZone = id as DeliveryZoneId;
    }
  }

  return closestZone;
}

/**
 * Computes the distance in km from Kariakoo Market to the customer's drop point coordinates.
 */
export function getDistanceKmFromKariakoo(lng: number, lat: number): number {
  return distanceKmBetween({ lat, lng }, ZONE_CENTERS.kariakoo);
}

/**
 * Computes delivery fee based directly on drop point coordinates (or fallback zone).
 */
export function deliveryFeeForDropoff(
  dropoff: [number, number] | null,
  zone: DeliveryZoneId,
  shopCount: number = 1
): { feeTzs: number; zone: DeliveryZoneId; distanceKm?: number } {
  if (dropoff && Number.isFinite(dropoff[0]) && Number.isFinite(dropoff[1])) {
    const detectedZone = getZoneFromCoordinates(dropoff[0], dropoff[1]);
    const distanceKm = getDistanceKmFromKariakoo(dropoff[0], dropoff[1]);
    const feeTzs = deliveryFeeFor(detectedZone, shopCount);
    return { feeTzs, zone: detectedZone, distanceKm };
  }
  return { feeTzs: deliveryFeeFor(zone, shopCount), zone };
}
