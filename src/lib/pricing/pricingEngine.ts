// KARIAKOO dynamic pricing engine (pure functions — safe on client or server).
//
// This formalises the marketplace fare + split formulas on top of the existing
// integer-TZS money helpers (src/lib/money.ts). Every amount is a whole number
// of Tanzanian shillings; there is no floating-point money arithmetic except the
// surge multiplier, which is applied once and rounded back to a whole shilling.
//
// Delivery Fee = max(baseFare + distanceKm*perKmRate + timeMins*perMinRate
//                    + paidWaiting, minimumFare) * surgeMultiplier
//
// The live checkout quote (src/lib/pricing.ts) and the place_order RPC remain
// the authoritative pricing path; this engine is the shared, tested formula that
// the DB config (pricing_configs / surge_zones) and the admin panel drive.

import { commissionFor } from "@/lib/money";

/** Configurable pricing rates. Integer TZS / basis points; mirrors pricing_configs. */
export interface PricingConfig {
  baseFareTzs: number;
  perKmRateTzs: number;
  perMinRateTzs: number;
  minimumFareTzs: number;
  bookingFeeTzs: number;
  /** Platform cut of the merchandise subtotal, in basis points (1000 = 10%). */
  sellerCommissionBps: number;
  /** Platform cut of the delivery fee, in basis points. */
  riderCommissionBps: number;
  /** Free waiting window at a stop before paid waiting starts. */
  freeWaitingMins: number;
  paidWaitingPerMinTzs: number;
  /** Cancellation fee once a job is cancelled past the free window. */
  cancellationFeeTzs: number;
  cancellationGraceMins: number;
}

/** Sensible defaults aligned with the current delivery.ts constants. */
export const DEFAULT_PRICING_CONFIG: PricingConfig = {
  baseFareTzs: 1_500,
  perKmRateTzs: 400,
  perMinRateTzs: 50,
  minimumFareTzs: 2_000,
  bookingFeeTzs: 500,
  sellerCommissionBps: 1_000, // 10%
  riderCommissionBps: 1_500, // 15%
  freeWaitingMins: 3,
  paidWaitingPerMinTzs: 100,
  cancellationFeeTzs: 1_000,
  cancellationGraceMins: 3,
};

export const SURGE_MIN = 1.0;
export const SURGE_MAX = 2.5;

export interface PricingParams {
  distanceKm: number;
  /** Estimated transit time in minutes. */
  durationMins: number;
  config: PricingConfig;
  /** Demand multiplier, clamped to [1.0, 2.5]. Defaults to 1.0. */
  surgeMultiplier?: number;
  /** Total minutes spent waiting at pickup + drop-off. Defaults to 0. */
  waitingMins?: number;
  /** Extra pickups (multi-shop orders) each add one base-fare-less leg fee. */
  extraPickups?: number;
  /** Per extra pickup charge. Defaults to 1000 (matches EXTRA_PICKUP_FEE_TZS). */
  extraPickupFeeTzs?: number;
}

export interface FareBreakdown {
  baseFareTzs: number;
  distanceTzs: number;
  timeTzs: number;
  waitingTzs: number;
  extraPickupsTzs: number;
  /** Sum before the minimum floor and surge are applied. */
  subtotalTzs: number;
  /** True when the minimum fare floor raised the price. */
  minimumApplied: boolean;
  surgeMultiplier: number;
  surgeApplied: boolean;
  /** Final customer-facing delivery fee, whole TZS. */
  deliveryFeeTzs: number;
}

export interface MarketplaceSplitInput {
  itemSubtotalTzs: number;
  deliveryFeeTzs: number;
  config: PricingConfig;
  bookingFeeTzs?: number;
  discountTzs?: number;
  tipsTzs?: number;
}

export interface PaymentSplits {
  itemSubtotalTzs: number;
  deliveryFeeTzs: number;
  bookingFeeTzs: number;
  discountTzs: number;
  tipsTzs: number;
  customerTotalTzs: number;
  sellerCommissionTzs: number;
  riderCommissionTzs: number;
  platformCommissionTzs: number;
  sellerNetPayoutTzs: number;
  riderNetEarningsTzs: number;
}

function assertFiniteNonNeg(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} must be a finite non-negative number (got ${value})`);
  }
}

/** Great-circle distance between two lat/lng points in kilometres (Haversine). */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371; // Earth radius, km
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Clamp a demand multiplier to the allowed surge band. */
export function clampSurge(multiplier: number | undefined): number {
  if (multiplier == null || !Number.isFinite(multiplier)) return SURGE_MIN;
  return Math.min(SURGE_MAX, Math.max(SURGE_MIN, multiplier));
}

/**
 * Compute a delivery fare from the dynamic formula. All component amounts are
 * rounded to whole TZS; the surge multiplier is applied last and rounded once.
 */
export function estimateDeliveryFare(params: PricingParams): FareBreakdown {
  const { config } = params;
  assertFiniteNonNeg(params.distanceKm, "distanceKm");
  assertFiniteNonNeg(params.durationMins, "durationMins");

  const waitingMins = params.waitingMins ?? 0;
  const extraPickups = Math.max(0, Math.trunc(params.extraPickups ?? 0));
  const extraPickupFeeTzs = params.extraPickupFeeTzs ?? 1_000;

  const baseFareTzs = config.baseFareTzs;
  const distanceTzs = Math.round(config.perKmRateTzs * params.distanceKm);
  const timeTzs = Math.round(config.perMinRateTzs * params.durationMins);
  const paidWaitingMins = Math.max(0, waitingMins - config.freeWaitingMins);
  const waitingTzs = Math.round(paidWaitingMins * config.paidWaitingPerMinTzs);
  const extraPickupsTzs = extraPickups * extraPickupFeeTzs;

  const subtotalTzs = baseFareTzs + distanceTzs + timeTzs + waitingTzs + extraPickupsTzs;
  const floored = Math.max(subtotalTzs, config.minimumFareTzs);
  const minimumApplied = config.minimumFareTzs > subtotalTzs;

  const surgeMultiplier = clampSurge(params.surgeMultiplier);
  const deliveryFeeTzs = Math.round(floored * surgeMultiplier);

  return {
    baseFareTzs,
    distanceTzs,
    timeTzs,
    waitingTzs,
    extraPickupsTzs,
    subtotalTzs,
    minimumApplied,
    surgeMultiplier,
    surgeApplied: surgeMultiplier > SURGE_MIN,
    deliveryFeeTzs,
  };
}

/**
 * Split an order's money between the customer, platform, seller and rider.
 *
 *   customerTotal   = itemSubtotal + deliveryFee + bookingFee - discounts
 *   platformComm    = itemSubtotal*sellerPct + deliveryFee*riderPct
 *   sellerNetPayout = itemSubtotal - itemSubtotal*sellerPct
 *   riderNetEarnings= deliveryFee - deliveryFee*riderPct + tips
 */
export function calculateMarketplaceSplits(input: MarketplaceSplitInput): PaymentSplits {
  const { config } = input;
  assertFiniteNonNeg(input.itemSubtotalTzs, "itemSubtotalTzs");
  assertFiniteNonNeg(input.deliveryFeeTzs, "deliveryFeeTzs");
  const bookingFeeTzs = input.bookingFeeTzs ?? config.bookingFeeTzs;
  const discountTzs = input.discountTzs ?? 0;
  const tipsTzs = input.tipsTzs ?? 0;
  assertFiniteNonNeg(bookingFeeTzs, "bookingFeeTzs");
  assertFiniteNonNeg(discountTzs, "discountTzs");
  assertFiniteNonNeg(tipsTzs, "tipsTzs");

  const sellerCommissionTzs = commissionFor(input.itemSubtotalTzs, config.sellerCommissionBps);
  const riderCommissionTzs = commissionFor(input.deliveryFeeTzs, config.riderCommissionBps);

  const customerTotalTzs = Math.max(
    0,
    input.itemSubtotalTzs + input.deliveryFeeTzs + bookingFeeTzs - discountTzs,
  );

  return {
    itemSubtotalTzs: input.itemSubtotalTzs,
    deliveryFeeTzs: input.deliveryFeeTzs,
    bookingFeeTzs,
    discountTzs,
    tipsTzs,
    customerTotalTzs,
    sellerCommissionTzs,
    riderCommissionTzs,
    platformCommissionTzs: sellerCommissionTzs + riderCommissionTzs,
    sellerNetPayoutTzs: input.itemSubtotalTzs - sellerCommissionTzs,
    riderNetEarningsTzs: input.deliveryFeeTzs - riderCommissionTzs + tipsTzs,
  };
}

/**
 * Cancellation fee: nothing within the grace window, otherwise the configured
 * flat fee. `minsSinceAccepted` is measured from rider acceptance.
 */
export function calculateCancellationFee(minsSinceAccepted: number, config: PricingConfig): number {
  if (!Number.isFinite(minsSinceAccepted) || minsSinceAccepted <= config.cancellationGraceMins) {
    return 0;
  }
  return config.cancellationFeeTzs;
}
