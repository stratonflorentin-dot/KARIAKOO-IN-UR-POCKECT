"use client";

import { Badge, type Tone } from "@/components/ui/Badge";
import { useI18n } from "@/i18n/client";
import type { DeliveryStatus, FulfillmentStatus, OrderStatus, PaymentStatus } from "@/lib/types";

const orderTone: Record<OrderStatus, Tone> = {
  placed: "neutral",
  confirmed: "info",
  preparing: "warning",
  out_for_delivery: "brand",
  delivered: "success",
  cancelled: "danger",
};

const paymentTone: Record<PaymentStatus, Tone> = {
  pending: "warning",
  successful: "success",
  failed: "danger",
  refunded: "neutral",
};

const fulfillmentTone: Record<FulfillmentStatus, Tone> = {
  awaiting_seller: "warning",
  accepted: "info",
  rejected: "danger",
  preparing: "warning",
  ready_for_pickup: "brand",
  picked_up: "brand",
  delivered: "success",
  cancelled: "danger",
};

const deliveryTone: Record<DeliveryStatus, Tone> = {
  PENDING_ASSIGNMENT: "warning",
  ASSIGNED: "info",
  ACCEPTED: "info",
  PICKED_UP: "brand",
  IN_TRANSIT: "brand",
  DELIVERED: "success",
  FAILED: "danger",
  CANCELLED: "neutral",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { t } = useI18n();
  return <Badge tone={orderTone[status]}>{t.status.order[status]}</Badge>;
}
export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const { t } = useI18n();
  return <Badge tone={paymentTone[status]}>{t.status.payment[status]}</Badge>;
}
export function FulfillmentBadge({ status }: { status: FulfillmentStatus }) {
  const { t } = useI18n();
  return <Badge tone={fulfillmentTone[status]}>{t.status.fulfillment[status]}</Badge>;
}
export function DeliveryStatusBadge({ status }: { status: DeliveryStatus }) {
  const { t } = useI18n();
  return <Badge tone={deliveryTone[status]}>{t.status.delivery[status]}</Badge>;
}
