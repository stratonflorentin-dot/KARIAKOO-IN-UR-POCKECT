// State machines for delivery, fulfilment and payment. Every status change
// must go through these checks (on the server) so no role can skip steps,
// e.g. a seller marking goods delivered or a rider jumping to DELIVERED.
import type { DeliveryStatus, FulfillmentStatus, OrderStatus, PaymentStatus, Role } from "@/lib/types";

export const deliveryTransitions: Record<DeliveryStatus, DeliveryStatus[]> = {
  PENDING_ASSIGNMENT: ["ASSIGNED", "CANCELLED"],
  ASSIGNED: ["ACCEPTED", "PENDING_ASSIGNMENT", "CANCELLED"], // rider declines → back to pool
  ACCEPTED: ["PICKED_UP", "PENDING_ASSIGNMENT", "CANCELLED"],
  PICKED_UP: ["IN_TRANSIT", "FAILED"],
  IN_TRANSIT: ["DELIVERED", "FAILED"],
  DELIVERED: [],
  FAILED: ["PENDING_ASSIGNMENT", "CANCELLED"], // admin may re-dispatch
  CANCELLED: [],
};

/** Which role may perform each delivery transition. */
const deliveryActor: Partial<Record<`${DeliveryStatus}>${DeliveryStatus}`, Role[]>> = {
  "PENDING_ASSIGNMENT>ASSIGNED": ["admin"],
  "PENDING_ASSIGNMENT>CANCELLED": ["admin"],
  "ASSIGNED>ACCEPTED": ["rider"],
  "ASSIGNED>PENDING_ASSIGNMENT": ["rider", "admin"],
  "ASSIGNED>CANCELLED": ["admin"],
  "ACCEPTED>PICKED_UP": ["rider"],
  "ACCEPTED>PENDING_ASSIGNMENT": ["admin"],
  "ACCEPTED>CANCELLED": ["admin"],
  "PICKED_UP>IN_TRANSIT": ["rider"],
  "PICKED_UP>FAILED": ["rider", "admin"],
  "IN_TRANSIT>DELIVERED": ["rider"], // and only with a verified PIN
  "IN_TRANSIT>FAILED": ["rider", "admin"],
  "FAILED>PENDING_ASSIGNMENT": ["admin"],
  "FAILED>CANCELLED": ["admin"],
};

export function canTransitionDelivery(from: DeliveryStatus, to: DeliveryStatus, role: Role): boolean {
  if (!deliveryTransitions[from].includes(to)) return false;
  return deliveryActor[`${from}>${to}`]?.includes(role) ?? false;
}

export const fulfillmentTransitions: Record<FulfillmentStatus, FulfillmentStatus[]> = {
  awaiting_seller: ["accepted", "rejected", "cancelled"],
  accepted: ["preparing", "cancelled"],
  rejected: [],
  preparing: ["ready_for_pickup", "cancelled"],
  ready_for_pickup: ["picked_up", "cancelled"],
  picked_up: ["delivered"],
  delivered: [],
  cancelled: [],
};

/** Sellers can never move their goods to picked_up or delivered: only the rider flow can. */
const sellerAllowed: FulfillmentStatus[] = ["accepted", "rejected", "preparing", "ready_for_pickup"];

export function canTransitionFulfillment(from: FulfillmentStatus, to: FulfillmentStatus, role: Role): boolean {
  if (!fulfillmentTransitions[from].includes(to)) return false;
  if (role === "seller") return sellerAllowed.includes(to);
  if (role === "rider") return to === "picked_up" || to === "delivered";
  if (role === "admin") return to === "cancelled";
  return false;
}

export const paymentTransitions: Record<PaymentStatus, PaymentStatus[]> = {
  pending: ["successful", "failed"],
  successful: ["refunded"],
  failed: ["pending"], // customer retries
  refunded: [],
};

/**
 * Payment status changes come only from verified provider confirmations
 * ("system") or an authorised admin refund. Never from the browser.
 */
export function canTransitionPayment(from: PaymentStatus, to: PaymentStatus, actor: "system" | Role): boolean {
  if (!paymentTransitions[from].includes(to)) return false;
  if (to === "refunded") return actor === "admin" || actor === "system";
  if (to === "pending") return actor === "customer" || actor === "system";
  return actor === "system";
}

export const orderStatusLabel: Record<OrderStatus, string> = {
  placed: "Order placed",
  confirmed: "Confirmed by shop",
  preparing: "Being prepared",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const paymentStatusLabel: Record<PaymentStatus, string> = {
  pending: "Payment pending",
  successful: "Paid",
  failed: "Payment failed",
  refunded: "Refunded",
};

export const fulfillmentStatusLabel: Record<FulfillmentStatus, string> = {
  awaiting_seller: "Awaiting seller",
  accepted: "Accepted",
  rejected: "Rejected",
  preparing: "Preparing",
  ready_for_pickup: "Ready for pickup",
  picked_up: "Picked up",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const deliveryStatusLabel: Record<DeliveryStatus, string> = {
  PENDING_ASSIGNMENT: "Waiting for rider",
  ASSIGNED: "Rider assigned",
  ACCEPTED: "Rider accepted",
  PICKED_UP: "Picked up",
  IN_TRANSIT: "On the way",
  DELIVERED: "Delivered",
  FAILED: "Delivery failed",
  CANCELLED: "Cancelled",
};

/** Customers may cancel only before the shop starts preparing and before payment succeeds. */
export function isCustomerCancellable(status: OrderStatus, payment: PaymentStatus): boolean {
  return status === "placed" && payment !== "successful";
}
