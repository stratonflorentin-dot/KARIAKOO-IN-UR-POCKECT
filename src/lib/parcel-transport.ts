// Ground Parcel Transport models and pricing for Kariakoo marketplace.
// Enables customers and shopkeepers to choose the exact vehicle type
// required for ground parcel delivery (boda boda, bajaji guta, pickup, light truck).

export type GroundTransportVehicleId = "pikipiki" | "bajaji" | "pickup" | "lori_dogo";

export interface GroundTransportVehicle {
  id: GroundTransportVehicleId;
  name: string;
  nameEn: string;
  cargoDescription: string;
  capacityWeightKg: number;
  capacitySummary: string;
  baseRateTzs: number;
  recommendedFor: string;
  iconType: "motorcycle" | "tricycle" | "pickup" | "truck";
  dimensions: string;
}

export const GROUND_TRANSPORT_VEHICLES: GroundTransportVehicle[] = [
  {
    id: "pickup",
    name: "Pickup Ndogo",
    nameEn: "Small Pickup (Suzuki Carry / Townace)",
    cargoDescription: "Mizigo midogo ya biashara",
    capacityWeightKg: 1000,
    capacitySummary: "Hadi kg 1,000 (Tani 1)",
    baseRateTzs: 21_000,
    recommendedFor: "Maboksi 10–25, bidhaa za maduka, vifaa vya ujenzi vyepesi",
    iconType: "pickup",
    dimensions: "Urefu 2.1m × Upana 1.4m",
  },
  {
    id: "bajaji",
    name: "Bajaji ya Mizigo",
    nameEn: "Cargo Tricycle (Guta / Three-Wheeler)",
    cargoDescription: "Mizigo midogo",
    capacityWeightKg: 400,
    capacitySummary: "Hadi kg 400",
    baseRateTzs: 17_000,
    recommendedFor: "Maboksi 3–8, nguo za jumla, vifurushi vya wastani",
    iconType: "tricycle",
    dimensions: "Urefu 1.5m × Upana 1.1m",
  },
  {
    id: "pikipiki",
    name: "Pikipiki ya Mizigo",
    nameEn: "Cargo Motorcycle (Boda Boda Carrier)",
    cargoDescription: "Vifurushi na mizigo midogo",
    capacityWeightKg: 60,
    capacitySummary: "Hadi kg 60",
    baseRateTzs: 11_500,
    recommendedFor: "Bahasha, viatu, simu, vipodozi, nguo jozi chache",
    iconType: "motorcycle",
    dimensions: "Raki ya nyuma / Begi la delivery",
  },
  {
    id: "lori_dogo",
    name: "Lori Dogo",
    nameEn: "Light Truck (Canter / Tipper)",
    cargoDescription: "Mizigo mingi ya biashara",
    capacityWeightKg: 3500,
    capacitySummary: "Hadi kg 3,500 (Tani 3.5)",
    baseRateTzs: 31_000,
    recommendedFor: "Mizigo mikubwa ya kontena, marobota ya nguo, vifaa vizito",
    iconType: "truck",
    dimensions: "Urefu 3.4m × Upana 1.9m",
  },
];

export function getVehicleById(id: GroundTransportVehicleId): GroundTransportVehicle {
  return GROUND_TRANSPORT_VEHICLES.find((v) => v.id === id) ?? GROUND_TRANSPORT_VEHICLES[0];
}

/**
 * Calculates delivery rate based on ground transport vehicle and optional zone multiplier.
 */
export function calculateParcelRate(
  vehicleId: GroundTransportVehicleId,
  zoneMultiplier: number = 1.0,
  shopCount: number = 1
): number {
  const vehicle = getVehicleById(vehicleId);
  const extraPickup = Math.max(0, shopCount - 1) * 2_000;
  return Math.round(vehicle.baseRateTzs * zoneMultiplier + extraPickup);
}

/**
 * Maps zone ID to distance multiplier from Kariakoo hub.
 */
export const ZONE_DISTANCE_MULTIPLIERS: Record<string, number> = {
  kariakoo: 1.0,
  ilala: 1.1,
  kinondoni: 1.25,
  ubungo: 1.35,
  temeke: 1.35,
  kigamboni: 1.5,
};
