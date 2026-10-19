"use server";

import { getSessionWithRole } from "@/lib/auth/session";
import {
  acceptOfferFor,
  advanceDeliveryFor,
  declineOfferFor,
  setPresenceFor,
  type DispatchResult,
  type RiderAdvanceTo,
} from "@/lib/data/dispatch";
import { verifyDeliveryPin } from "@/lib/delivery-pin";

export interface PinState {
  status: "idle" | "ok" | "error";
  message?: string;
}

const messages = {
  not_found: "This delivery is not assigned to you.",
  wrong_status: "This delivery is not in transit on the server, so it cannot be completed yet.",
  invalid_format: "Enter the 4-digit PIN from the customer.",
  incorrect: "That PIN is not correct.",
  locked: "Too many wrong attempts. Contact dispatch to continue.",
} as const;

/** Server-side PIN check: only the assigned rider, only while in transit, with attempt limits. */
export async function submitDeliveryPin(_prev: PinState, formData: FormData): Promise<PinState> {
  const session = await getSessionWithRole("rider");
  if (!session) return { status: "error", message: "Please sign in as a rider." };
  const result = verifyDeliveryPin(session, String(formData.get("orderId") ?? ""), String(formData.get("pin") ?? ""));
  if (result.ok) return { status: "ok", message: "PIN verified by the server. Delivery confirmed." };
  const left = result.reason === "incorrect" && result.attemptsLeft ? ` ${result.attemptsLeft} attempts left.` : "";
  return { status: "error", message: messages[result.reason] + left };
}

/* ----------------------------- Dispatch ----------------------------- */

// These call the Phase 6 database functions for a signed-in Supabase rider,
// and are no-ops (demo: true) for the development role preview. The UI only
// invokes them when it is in live mode, so the demo preview is untouched.
const NOT_A_RIDER: DispatchResult = { ok: false, demo: false, message: "Please sign in as a rider." };

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
