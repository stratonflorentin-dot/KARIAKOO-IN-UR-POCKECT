// Payment status state machine. This mirrors the validated transitions in the
// `record_payment_transaction` database function exactly — the database is the
// authority; this is for client-side validation, tests, and UI copy. A payment
// is never marked successful from a browser redirect: only a recorded, verified
// event (admin reconciliation today, a verified provider webhook later) moves it.

export type PaymentStatus = "pending" | "successful" | "failed" | "refunded";

/** Events the ledger records. `cod_collected` is the rider taking cash on delivery. */
export type PaymentEvent = "initiated" | "succeeded" | "failed" | "refunded" | "cod_collected";

const EVENT_TARGET: Record<PaymentEvent, PaymentStatus> = {
  initiated: "pending",
  succeeded: "successful",
  cod_collected: "successful",
  failed: "failed",
  refunded: "refunded",
};

// Which target statuses are reachable from each current status.
const ALLOWED: Record<PaymentStatus, readonly PaymentStatus[]> = {
  pending: ["pending", "successful", "failed"],
  failed: ["pending", "failed", "successful"],
  successful: ["successful", "refunded"],
  refunded: ["refunded"],
};

/** The status an event moves a payment to. */
export function paymentEventTarget(event: PaymentEvent): PaymentStatus {
  return EVENT_TARGET[event];
}

/** Whether a direct status change is allowed. */
export function canTransitionPayment(from: PaymentStatus, to: PaymentStatus): boolean {
  return ALLOWED[from]?.includes(to) ?? false;
}

export interface PaymentTransitionResult {
  ok: boolean;
  to: PaymentStatus;
  reason?: string;
}

/** Apply an event to a current status, reporting whether it was permitted. */
export function applyPaymentEvent(from: PaymentStatus, event: PaymentEvent): PaymentTransitionResult {
  const to = paymentEventTarget(event);
  if (!canTransitionPayment(from, to)) {
    return { ok: false, to: from, reason: `Payment transition ${from} -> ${to} is not allowed` };
  }
  return { ok: true, to };
}
