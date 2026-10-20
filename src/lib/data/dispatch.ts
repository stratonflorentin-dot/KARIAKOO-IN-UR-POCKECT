import "server-only";

import type { Session } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { DeliveryStatus } from "@/lib/types";

export type DispatchResult =
  | { ok: true; status?: DeliveryStatus }
  | { ok: false; message: string };

export type RiderAdvanceTo = Extract<DeliveryStatus, "PICKED_UP" | "IN_TRANSIT">;

function isLiveRider(session: Session | null): session is Session {
  return Boolean(session && session.role === "rider" && isSupabaseConfigured());
}

function friendly(message: string | undefined, fallback: string): string {
  const text = (message ?? "").trim();
  return text.length > 0 && text.length < 200 ? text : fallback;
}

export async function acceptOfferFor(session: Session | null, orderId: string): Promise<DispatchResult> {
  if (!isLiveRider(session)) return { ok: false, message: "Please sign in as a rider." };
  const sb = await createSupabaseServerClient();
  const { data, error } = await sb.rpc("rider_accept_offer", { p_order: orderId });
  if (error) return { ok: false, message: friendly(error.message, "Could not accept this job. It may have been taken.") };
  return { ok: true, status: data as DeliveryStatus };
}

export async function declineOfferFor(session: Session | null, orderId: string): Promise<DispatchResult> {
  if (!isLiveRider(session)) return { ok: false, message: "Please sign in as a rider." };
  const sb = await createSupabaseServerClient();
  const { error } = await sb.rpc("rider_decline_offer", { p_order: orderId });
  if (error) return { ok: false, message: friendly(error.message, "Could not decline this job.") };
  return { ok: true };
}

export async function advanceDeliveryFor(session: Session | null, orderId: string, to: RiderAdvanceTo): Promise<DispatchResult> {
  if (!isLiveRider(session)) return { ok: false, message: "Please sign in as a rider." };
  const sb = await createSupabaseServerClient();
  const { data, error } = await sb.rpc("rider_advance_delivery", { p_order: orderId, p_to: to });
  if (error) return { ok: false, message: friendly(error.message, "Could not update this delivery.") };
  return { ok: true, status: data as DeliveryStatus };
}

export async function setPresenceFor(session: Session | null, online: boolean, lng?: number, lat?: number): Promise<DispatchResult> {
  if (!isLiveRider(session)) return { ok: false, message: "Please sign in as a rider." };
  const sb = await createSupabaseServerClient();
  const { error } = await sb.rpc("rider_set_presence", {
    p_online: online,
    p_lng: lng ?? null,
    p_lat: lat ?? null,
  });
  if (error) return { ok: false, message: friendly(error.message, "Could not update your availability.") };
  return { ok: true };
}

export async function riderPresenceFor(session: Session | null): Promise<boolean> {
  if (!isLiveRider(session)) return false;
  const sb = await createSupabaseServerClient();
  const { data, error } = await sb.from("rider_presence").select("is_online").eq("rider_id", session.userId).limit(1);
  if (error) return false;
  return Boolean((data?.[0] as { is_online?: boolean } | undefined)?.is_online);
}
