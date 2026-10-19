import "server-only";

// Rider dispatch: the bridge between the rider app and the Phase 6 database
// functions (offer_delivery / rider_accept_offer / rider_decline_offer /
// rider_advance_delivery / rider_set_presence in the rider_dispatch migration).
//
// Two modes, decided per call by `riderIsLive`:
//  * LIVE — a rider signed in through Supabase Auth. We call the SECURITY
//    DEFINER RPCs with their session, so Row Level Security and the server-side
//    state machine do the real work.
//  * DEMO — the development role preview (no real Supabase user). We touch the
//    database for NOTHING and return { demo: true } so the UI keeps its on-phone
//    preview behaviour. This is why the preview still works with no auth, and
//    why we never fake a rider token.
//
// Supabase Auth for riders does not exist yet, so today every call is DEMO.
// The live branch is wired and ready but is NOT exercised until auth lands;
// treat it as unverified end-to-end until then.
import type { Session } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { DeliveryStatus } from "@/lib/types";

export type DispatchResult =
  | { ok: true; demo: boolean; status?: DeliveryStatus }
  | { ok: false; demo: boolean; message: string };

/** The only statuses a rider may move a delivery to through the app. */
export type RiderAdvanceTo = Extract<DeliveryStatus, "PICKED_UP" | "IN_TRANSIT">;

/**
 * Is this rider backed by a real Supabase session, so the live RPCs apply?
 * A demo-preview identity (or Supabase not configured) means no.
 */
export function riderIsLive(session: Session | null): boolean {
  return Boolean(session && session.role === "rider" && !session.isDemo && isSupabaseConfigured());
}

/** A plpgsql RAISE comes back as error.message; keep it, with a safe fallback. */
function friendly(message: string | undefined, fallback: string): string {
  const m = (message ?? "").trim();
  return m.length > 0 && m.length < 200 ? m : fallback;
}

export async function acceptOfferFor(session: Session | null, orderId: string): Promise<DispatchResult> {
  if (!riderIsLive(session)) return { ok: true, demo: true };
  const sb = await createSupabaseServerClient();
  const { data, error } = await sb.rpc("rider_accept_offer", { p_order: orderId });
  if (error) return { ok: false, demo: false, message: friendly(error.message, "Could not accept this job. It may have been taken.") };
  return { ok: true, demo: false, status: data as DeliveryStatus };
}

export async function declineOfferFor(session: Session | null, orderId: string): Promise<DispatchResult> {
  if (!riderIsLive(session)) return { ok: true, demo: true };
  const sb = await createSupabaseServerClient();
  const { error } = await sb.rpc("rider_decline_offer", { p_order: orderId });
  if (error) return { ok: false, demo: false, message: friendly(error.message, "Could not decline this job.") };
  return { ok: true, demo: false };
}

export async function advanceDeliveryFor(session: Session | null, orderId: string, to: RiderAdvanceTo): Promise<DispatchResult> {
  if (!riderIsLive(session)) return { ok: true, demo: true };
  const sb = await createSupabaseServerClient();
  const { data, error } = await sb.rpc("rider_advance_delivery", { p_order: orderId, p_to: to });
  if (error) return { ok: false, demo: false, message: friendly(error.message, "Could not update this delivery.") };
  return { ok: true, demo: false, status: data as DeliveryStatus };
}

export async function setPresenceFor(
  session: Session | null,
  online: boolean,
  lng?: number,
  lat?: number,
): Promise<DispatchResult> {
  if (!riderIsLive(session)) return { ok: true, demo: true };
  const sb = await createSupabaseServerClient();
  const { error } = await sb.rpc("rider_set_presence", {
    p_online: online,
    p_lng: lng ?? null,
    p_lat: lat ?? null,
  });
  if (error) return { ok: false, demo: false, message: friendly(error.message, "Could not update your availability.") };
  return { ok: true, demo: false };
}
