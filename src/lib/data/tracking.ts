import "server-only";

// Live delivery tracking for the customer's order page.
//
// The honest state today: a customer cannot yet see their rider's live
// position. Rider GPS is stored in `rider_presence` (the Phase 6 dispatch
// migration), but its Row Level Security lets only the rider themselves and
// admins read it — by design. Showing it to the order's customer needs a
// dedicated, minimal SECURITY DEFINER function (e.g. order_rider_position)
// that returns ONLY the assigned rider's latest fix to that order's customer,
// plus a real signed-in customer session. Until both exist, there is no live
// position to show and this returns null, so the order page keeps its honest
// static route and "not live yet" note. No fake coordinates.
import type { Order } from "@/lib/types";

export interface LivePosition {
  lng: number;
  lat: number;
  updatedAt: string;
}

/**
 * The assigned rider's latest known position for this order, or null when live
 * tracking is not available (always null today — see the note above).
 */
export async function riderLivePosition(_order: Order): Promise<LivePosition | null> {
  return null;
}
