// Ground Parcel Transport models and pricing for Kariakoo marketplace.
// Implements official Bolt Tanzania ride & trip pricing structure
// (Reference: https://bolt.eu/en-tz/support/articles/115002917754/)
//
// Formula:
// Trip Price = Max(Minimum Fare, Base Fare + (Distance in km × Km Rate) + (Duration in min × Minute Rate))
//              × Dynamic Pricing (Surge) + Booking / Safety Fee (3.5%)

export type GroundTransportVehicleId = "pikipiki" | "bajaji" | "pickup" | "lori_dogo";

export interface BoltTariff {
  baseFareTzs: number;
  perKmRateTzs: number;
  perMinuteRateTzs: number;
  minimumFareTzs: number;
  averageSpeedKmH: number;
}

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
  imageUrl: string;
  dimensions: string;
  tariff: BoltTariff;
}

/**
 * Standard Bolt Tanzania tariff schedules adapted for cargo and parcel transport
 */
export const BOLT_TANZANIA_TARIFFS: Record<GroundTransportVehicleId, BoltTariff> = {
  pikipiki: {
    baseFareTzs: 1_200,
    perKmRateTzs: 450,
    perMinuteRateTzs: 60,
    minimumFareTzs: 2_500,
    averageSpeedKmH: 26,
  },
  bajaji: {
    baseFareTzs: 2_500,
    perKmRateTzs: 750,
    perMinuteRateTzs: 100,
    minimumFareTzs: 5_000,
    averageSpeedKmH: 20,
  },
  pickup: {
    baseFareTzs: 5_000,
    perKmRateTzs: 1_100,
    perMinuteRateTzs: 150,
    minimumFareTzs: 12_000,
    averageSpeedKmH: 22,
  },
  lori_dogo: {
    baseFareTzs: 9_000,
    perKmRateTzs: 1_600,
    perMinuteRateTzs: 200,
    minimumFareTzs: 22_000,
    averageSpeedKmH: 18,
  },
};

/** Booking fee percentage applied in Bolt Tanzania (3.5%) */
export const BOLT_BOOKING_FEE_PERCENTAGE = 0.035;

export const GROUND_TRANSPORT_VEHICLES: GroundTransportVehicle[] = [
  {
    id: "pickup",
    name: "Pickup Ndogo",
    nameEn: "Small Pickup (Suzuki Carry / Townace)",
    cargoDescription: "Mizigo midogo ya biashara",
    capacityWeightKg: 1000,
    capacitySummary: "Hadi kg 1,000 (Tani 1)",
    baseRateTzs: 14_000,
    recommendedFor: "Maboksi 10–25, bidhaa za maduka, vifaa vya ujenzi vyepesi",
    iconType: "pickup",
    imageUrl: "/images/transport/pickup.png",
    dimensions: "Urefu 2.1m × Upana 1.4m",
    tariff: BOLT_TANZANIA_TARIFFS.pickup,
  },
  {
    id: "bajaji",
    name: "Bajaji ya Mizigo",
    nameEn: "Cargo Tricycle (Guta / Three-Wheeler)",
    cargoDescription: "Mizigo midogo",
    capacityWeightKg: 400,
    capacitySummary: "Hadi kg 400",
    baseRateTzs: 5_500,
    recommendedFor: "Maboksi 3–8, nguo za jumla, vifurushi vya wastani",
    iconType: "tricycle",
    imageUrl: "/images/transport/bajaji.png",
    dimensions: "Urefu 1.5m × Upana 1.1m",
    tariff: BOLT_TANZANIA_TARIFFS.bajaji,
  },
  {
    id: "pikipiki",
    name: "Pikipiki ya Mizigo",
    nameEn: "Cargo Motorcycle (Boda Boda Carrier)",
    cargoDescription: "Vifurushi na mizigo midogo",
    capacityWeightKg: 60,
    capacitySummary: "Hadi kg 60",
    baseRateTzs: 2_500,
    recommendedFor: "Bahasha, viatu, simu, vipodozi, nguo jozi chache",
    iconType: "motorcycle",
    imageUrl: "/images/transport/pikipiki.png",
    dimensions: "Raki ya nyuma / Begi la delivery",
    tariff: BOLT_TANZANIA_TARIFFS.pikipiki,
  },
  {
    id: "lori_dogo",
    name: "Lori Dogo",
    nameEn: "Light Truck (Canter / Tipper)",
    cargoDescription: "Mizigo mingi ya biashara",
    capacityWeightKg: 3500,
    capacitySummary: "Hadi kg 3,500 (Tani 3.5)",
    baseRateTzs: 25_000,
    recommendedFor: "Mizigo mikubwa ya kontena, marobota ya nguo, vifaa vizito",
    iconType: "truck",
    imageUrl: "/images/transport/lori_dogo.png",
    dimensions: "Urefu 3.4m × Upana 1.9m",
    tariff: BOLT_TANZANIA_TARIFFS.lori_dogo,
  },
];

export function getVehicleById(id: GroundTransportVehicleId): GroundTransportVehicle {
  return GROUND_TRANSPORT_VEHICLES.find((v) => v.id === id) ?? GROUND_TRANSPORT_VEHICLES[0];
}

/**
 * Estimated road distance (km) from central Kariakoo market to each Dar es Salaam delivery zone.
 */
export const ZONE_ESTIMATED_KM: Record<string, number> = {
  kariakoo: 2.5,
  ilala: 4.5,
  kinondoni: 9.5,
  ubungo: 13.5,
  temeke: 11.0,
  kigamboni: 15.0,
};

/**
 * Dynamically computes accurate vehicle trip price based on customer's delivery zone.
 */
export function getVehiclePriceForZone(
  vehicleId: GroundTransportVehicleId,
  zoneId: string = "kariakoo"
): number {
  const km = ZONE_ESTIMATED_KM[zoneId] ?? 4.0;
  const trip = calculateBoltTripPrice(vehicleId, km);
  return trip.totalFareTzs;
}

export interface TripPriceBreakdown {
  vehicleId: GroundTransportVehicleId;
  distanceKm: number;
  durationMinutes: number;
  baseFareTzs: number;
  distanceFareTzs: number;
  timeFareTzs: number;
  subtotalTzs: number;
  bookingFeeTzs: number;
  surgeMultiplier: number;
  totalFareTzs: number;
  isMinimumFareApplied: boolean;
}

/**
 * Calculates official Bolt Tanzania trip price per vehicle category.
 * Reference: https://bolt.eu/en-tz/support/articles/115002917754/
 * 
 * Total = (Base + KmRate*Distance + MinuteRate*Duration) * Surge + BookingFee
 */
export function calculateBoltTripPrice(
  vehicleId: GroundTransportVehicleId,
  distanceKm: number,
  durationMinutes?: number,
  surgeMultiplier: number = 1.0,
  shopCount: number = 1
): TripPriceBreakdown {
  const vehicle = getVehicleById(vehicleId);
  const tariff = vehicle.tariff;

  // Calculate estimated transit duration based on Dar es Salaam city traffic if not provided
  const estDuration =
    durationMinutes ??
    Math.max(10, Math.round((distanceKm / tariff.averageSpeedKmH) * 60) + 6); // + 6 min traffic cushion

  const distanceFareTzs = Math.round(distanceKm * tariff.perKmRateTzs);
  const timeFareTzs = Math.round(estDuration * tariff.perMinuteRateTzs);
  const extraPickupTzs = Math.max(0, shopCount - 1) * 2_000;

  const rawComputedFare = tariff.baseFareTzs + distanceFareTzs + timeFareTzs + extraPickupTzs;
  const isMinimumFareApplied = rawComputedFare < tariff.minimumFareTzs;
  const baselineFare = Math.max(tariff.minimumFareTzs, rawComputedFare);

  const subtotalWithSurge = Math.round(baselineFare * Math.max(1.0, surgeMultiplier));
  const bookingFeeTzs = Math.round(subtotalWithSurge * BOLT_BOOKING_FEE_PERCENTAGE);
  const totalFareTzs = Math.round(subtotalWithSurge + bookingFeeTzs);

  return {
    vehicleId,
    distanceKm: Number(distanceKm.toFixed(1)),
    durationMinutes: estDuration,
    baseFareTzs: tariff.baseFareTzs,
    distanceFareTzs,
    timeFareTzs,
    subtotalTzs: subtotalWithSurge,
    bookingFeeTzs,
    surgeMultiplier,
    totalFareTzs,
    isMinimumFareApplied,
  };
}

/**
 * Calculates parcel rate with zone multiplier fallback.
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
 * Known real ground route distances in Dar es Salaam (km).
 */
export const POPULAR_DAR_ROUTES: { from: string; to: string; distanceKm: number; durationMin: number }[] = [
  { from: "Newland", to: "Moshi Bus Stand", distanceKm: 11.2, durationMin: 28 },
  { from: "Kariakoo (Mtaa wa Lumumba)", to: "Mbezi Luis Bus Terminal", distanceKm: 18.5, durationMin: 45 },
  { from: "Kariakoo Sokoni", to: "Mwenge / Sinza", distanceKm: 12.0, durationMin: 32 },
  { from: "Kariakoo (Msimbazi)", to: "Kariakoo & Posta (City Centre)", distanceKm: 3.5, durationMin: 14 },
  { from: "Kariakoo (Kongo St)", to: "Tegeta / Bunju", distanceKm: 28.0, durationMin: 65 },
  { from: "Kariakoo (Aggrey St)", to: "Temeke / Mbagala Rangi Tatu", distanceKm: 15.0, durationMin: 38 },
];
