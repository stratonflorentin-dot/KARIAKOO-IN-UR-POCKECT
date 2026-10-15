"use server";

import { getSessionWithRole } from "@/lib/auth/session";
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
