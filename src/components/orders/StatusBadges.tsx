import { Badge, type Tone } from "@/components/ui/Badge";
import {
  deliveryStatusLabel,
  fulfillmentStatusLabel,
  orderStatusLabel,
  paymentStatusLabel,
} from "@/lib/status";
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

export const OrderStatusBadge = ({ status }: { status: OrderStatus }) => <Badge tone={orderTone[status]}>{orderStatusLabel[status]}</Badge>;
export const PaymentStatusBadge = ({ status }: { status: PaymentStatus }) => <Badge tone={paymentTone[status]}>{paymentStatusLabel[status]}</Badge>;
export const FulfillmentBadge = ({ status }: { status: FulfillmentStatus }) => <Badge tone={fulfillmentTone[status]}>{fulfillmentStatusLabel[status]}</Badge>;
export const DeliveryStatusBadge = ({ status }: { status: DeliveryStatus }) => <Badge tone={deliveryTone[status]}>{deliveryStatusLabel[status]}</Badge>;
