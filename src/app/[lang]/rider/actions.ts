"use server";

import { getSessionWithRole } from "@/lib/auth/session";
import {
  acceptOfferFor,
  advanceDeliveryFor,
  declineOfferFor,
  setPresenceFor,
  updateRiderLocationFor,
  type DispatchResult,
  type RiderAdvanceTo,
} from "@/lib/data/dispatch";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface PinState {
  status: "idle" | "ok" | "error";
  message?: string;
}

const messages = {
  not_found: "This delivery is not assigned to you.",
  wrong_status: "This delivery is not in transit on the server, so it cannot be completed yet.",
  invalid_format: "Enter the 4-digit PIN from the customer.",
  incorrect: "That PIN is not correct.",
  locked: "Too many incorrect PINs. Please wait a few minutes before trying again.",
} as const;

/** Server-side PIN check and delivery completion through the database authority. */
export async function submitDeliveryPin(_prev: PinState, formData: FormData): Promise<PinState> {
  const session = await getSessionWithRole("rider");
  if (!session) return { status: "error", message: "Please sign in as a rider." };
  const orderId = String(formData.get("orderId") ?? "");
  const pin = String(formData.get("pin") ?? "");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(orderId)) return { status: "error", message: messages.not_found };
  if (!/^\d{4}$/.test(pin)) return { status: "error", message: messages.invalid_format };
  const sb = await createSupabaseServerClient();
  const { data, error } = await sb.rpc("rider_complete_delivery", { p_order: orderId, p_pin: pin });
  // Authorisation/state problems still raise; PIN outcomes come back as data.
  if (error) {
    const detail = error.message.toLowerCase();
    if (detail.includes("in transit")) return { status: "error", message: messages.wrong_status };
    if (detail.includes("assigned")) return { status: "error", message: messages.not_found };
    return { status: "error", message: "Could not confirm delivery. Please try again." };
  }
  const res = (data ?? {}) as { ok?: boolean; error?: string };
  if (res.ok) return { status: "ok", message: "PIN verified. Delivery confirmed." };
  if (res.error === "locked") return { status: "error", message: messages.locked };
  return { status: "error", message: messages.incorrect };
}

/* ------------------------------ Safety ------------------------------ */

export interface SosResult {
  ok: boolean;
  message?: string;
}

/** File a database-backed SOS incident for the signed-in rider (dispatch sees it). */
export async function reportSosIncident(lat?: number, lng?: number): Promise<SosResult> {
  const session = await getSessionWithRole("rider");
  if (!session) return { ok: false, message: "Please sign in as a rider." };
  const sb = await createSupabaseServerClient();
  const { error } = await sb.rpc("rider_report_incident", {
    p_kind: "sos",
    p_note: "SOS triggered from the rider app",
    p_order: null,
    p_lat: typeof lat === "number" && Number.isFinite(lat) ? lat : null,
    p_lng: typeof lng === "number" && Number.isFinite(lng) ? lng : null,
  });
  if (error) return { ok: false, message: "Couldn't reach dispatch. Please call emergency services now." };
  return { ok: true, message: "Alert sent to dispatch. Stay safe — call emergency services if you're in danger." };
}

/* ----------------------------- Dispatch ----------------------------- */

// Dispatch actions operate on the signed-in Supabase rider's records.
const NOT_A_RIDER: DispatchResult = { ok: false, message: "Please sign in as a rider." };

/** Accept an offered job: the first rider to accept wins. */
export async function acceptOffer(orderId: string): Promise<DispatchResult> {
  const session = await getSessionWithRole("rider");
  if (!session) return NOT_A_RIDER;
  return acceptOfferFor(session, orderId);
}

/** Decline an offered job so it returns to dispatch. */
export async function declineOffer(orderId: string): Promise<DispatchResult> {
  const session = await getSessionWithRole("rider");
  if (!session) return NOT_A_RIDER;
  return declineOfferFor(session, orderId);
}

/** Move an accepted job forward (picked up → in transit). */
export async function advanceDelivery(orderId: string, to: RiderAdvanceTo): Promise<DispatchResult> {
  const session = await getSessionWithRole("rider");
  if (!session) return NOT_A_RIDER;
  return advanceDeliveryFor(session, orderId, to);
}

/** Go online/offline and (optionally) report the rider's current location. */
export async function setRiderPresence(online: boolean, lng?: number, lat?: number): Promise<DispatchResult> {
  const session = await getSessionWithRole("rider");
  if (!session) return NOT_A_RIDER;
  return setPresenceFor(session, online, lng, lat);
}

/** Keep an online rider's location fresh for assigned customer tracking. */
export async function updateRiderLocation(lng: number, lat: number): Promise<DispatchResult> {
  const session = await getSessionWithRole("rider");
  if (!session) return NOT_A_RIDER;
  return updateRiderLocationFor(session, lng, lat);
}
