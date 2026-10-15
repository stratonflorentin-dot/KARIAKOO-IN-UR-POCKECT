import "server-only";

// Delivery PIN verification. The customer gives the rider a 4-digit PIN on
// arrival; only the assigned rider, for an in-transit delivery, may submit
// it, and attempts are limited to stop guessing.
import { timingSafeEqual } from "node:crypto";
import { demoDeliveryPins } from "@/data/demo/delivery-pins";
import { demoOrders } from "@/data/demo/orders";
import { assertRole, type Session } from "@/lib/auth/session";

export const MAX_PIN_ATTEMPTS = 5;

// In-memory attempt counter (per server process). Phase 4 moves this to the
// database so limits survive restarts and apply across instances.
const attempts = new Map<string, number>();

export type PinResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "wrong_status" | "invalid_format" | "incorrect" | "locked"; attemptsLeft?: number };

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function verifyDeliveryPin(session: Session | null, orderId: string, pin: unknown): PinResult {
  assertRole(session, "rider");
  const order = demoOrders.find((o) => o.id === orderId);
  // Same answer for "doesn't exist" and "not yours" so ids can't be probed.
  if (!order || order.delivery.riderId !== session.riderId) return { ok: false, reason: "not_found" };
  if (order.delivery.status !== "IN_TRANSIT") return { ok: false, reason: "wrong_status" };
  if (typeof pin !== "string" || !/^\d{4}$/.test(pin)) return { ok: false, reason: "invalid_format" };

  const key = `${session.riderId}:${orderId}`;
  const used = attempts.get(key) ?? 0;
  if (used >= MAX_PIN_ATTEMPTS) return { ok: false, reason: "locked" };

  const expected = demoDeliveryPins[orderId];
  if (expected && safeEqual(pin, expected)) {
    attempts.delete(key);
    return { ok: true };
  }
  attempts.set(key, used + 1);
  const left = MAX_PIN_ATTEMPTS - used - 1;
  return left <= 0 ? { ok: false, reason: "locked" } : { ok: false, reason: "incorrect", attemptsLeft: left };
}

/** Test helper. */
export function resetPinAttempts() {
  attempts.clear();
}

/** The customer may see the PIN for their own active order only. */
export function deliveryPinForCustomer(session: Session | null, orderId: string): string | null {
  assertRole(session, "customer");
  const order = demoOrders.find((o) => o.id === orderId);
  if (!order || order.customerId !== session.customerId) return null;
  if (!["ACCEPTED", "PICKED_UP", "IN_TRANSIT", "ASSIGNED"].includes(order.delivery.status)) return null;
  return demoDeliveryPins[orderId] ?? null;
}
