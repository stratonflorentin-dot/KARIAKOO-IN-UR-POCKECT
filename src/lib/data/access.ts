import "server-only";

// Role-scoped data access. Each function takes the caller's server-side
// session and returns ONLY the records that role may see. This is the
// application-level twin of the Row Level Security policies planned for
// Phase 2: both layers must agree, and RLS is the last line of defence.
import { dropoffGeo, shopGeo, type LngLat } from "@/data/demo/geo";
import { demoOrders } from "@/data/demo/orders";
import { demoCustomers, demoRiders } from "@/data/demo/people";
import { demoProducts } from "@/data/demo/products";
import { demoShops } from "@/data/demo/shops";
import { assertRole, type Session } from "@/lib/auth/session";
import { breakdown } from "@/lib/money";
import type { DeliveryStatus, FulfillmentGroup, Order, OrderItem, Product, Shop } from "@/lib/types";

/* ----------------------------- Customer ----------------------------- */

export function customerOrders(session: Session | null): Order[] {
  assertRole(session, "customer");
  return demoOrders
    .filter((o) => o.customerId === session.customerId)
    .sort((a, b) => b.placedAt.localeCompare(a.placedAt));
}

/** Returns null (not "forbidden") for other people's orders, so ids can't be probed. */
export function customerOrder(session: Session | null, orderId: string): Order | null {
  assertRole(session, "customer");
  const order = demoOrders.find((o) => o.id === orderId);
  return order && order.customerId === session.customerId ? order : null;
}

export function customerProfile(session: Session | null) {
  assertRole(session, "customer");
  return demoCustomers.find((c) => c.id === session.customerId) ?? null;
}

/* ------------------------------ Seller ------------------------------ */

export interface SellerOrderView {
  orderId: string;
  reference: string;
  placedAt: string;
  paymentStatus: Order["paymentStatus"];
  group: FulfillmentGroup;
  /** Only this seller's items. */
  items: OrderItem[];
  /** Customer first name and area only: sellers never get contact details. */
  customerFirstName: string;
  zone: Order["zone"];
  deliveryStatus: DeliveryStatus;
  riderName?: string;
}

export function sellerShop(session: Session | null): Shop | null {
  assertRole(session, "seller");
  return demoShops.find((s) => s.id === session.shopId) ?? null;
}

export function sellerProducts(session: Session | null): Product[] {
  assertRole(session, "seller");
  return demoProducts.filter((p) => p.shopId === session.shopId);
}

export function sellerOrders(session: Session | null): SellerOrderView[] {
  assertRole(session, "seller");
  const shopId = session.shopId;
  return demoOrders
    .filter((o) => o.groups.some((g) => g.shopId === shopId))
    .sort((a, b) => b.placedAt.localeCompare(a.placedAt))
    .map((o) => ({
      orderId: o.id,
      reference: o.reference,
      placedAt: o.placedAt,
      paymentStatus: o.paymentStatus,
      group: o.groups.find((g) => g.shopId === shopId)!,
      items: o.items.filter((i) => i.shopId === shopId),
      customerFirstName: demoCustomers.find((c) => c.id === o.customerId)?.name.split(" ")[0] ?? "Customer",
      zone: o.zone,
      deliveryStatus: o.delivery.status,
      riderName: demoRiders.find((r) => r.id === o.delivery.riderId)?.name,
    }));
}

/* ------------------------------ Rider ------------------------------- */

/** Statuses in which the assigned rider needs the customer's contact details. */
const CONTACT_VISIBLE: DeliveryStatus[] = ["ACCEPTED", "PICKED_UP", "IN_TRANSIT"];

export interface RiderJobView {
  orderId: string;
  reference: string;
  placedAt: string;
  status: DeliveryStatus;
  payoutTzs: number;
  pickups: { shopId: string; shopName: string; address: string; itemCount: number; items: { name: string; quantity: number }[]; ready: boolean; geo?: LngLat }[];
  zone: Order["zone"];
  dropoffAddress: string;
  dropoffGeo?: LngLat;
  instructions?: string;
  /** Present only while the rider is actively handling the delivery. */
  customer?: { name: string; phone: string };
  history: Order["delivery"]["history"];
  /** When the delivery was completed, if it was. */
  deliveredAt?: string;
  /** Cash to collect for cash-on-delivery orders that are not yet paid. */
  cashToCollectTzs: number;
}

function toRiderJob(o: Order): RiderJobView {
  const customer = demoCustomers.find((c) => c.id === o.customerId);
  return {
    orderId: o.id,
    reference: o.reference,
    placedAt: o.placedAt,
    status: o.delivery.status,
    payoutTzs: o.delivery.riderPayoutTzs,
    pickups: o.groups.map((g) => {
      const shop = demoShops.find((s) => s.id === g.shopId);
      const lines = o.items.filter((i) => i.shopId === g.shopId);
      return {
        shopId: g.shopId,
        shopName: shop?.name ?? g.shopId,
        items: lines.map((i) => ({ name: i.productName, quantity: i.quantity })),
        address: shop?.address ?? "",
        itemCount: o.items.filter((i) => i.shopId === g.shopId).reduce((s, i) => s + i.quantity, 0),
        ready: g.status === "ready_for_pickup" || g.status === "picked_up" || g.status === "delivered",
        geo: shopGeo[g.shopId],
      };
    }),
    zone: o.zone,
    dropoffAddress: o.address,
    dropoffGeo: dropoffGeo[o.id],
    instructions: o.instructions,
    customer: CONTACT_VISIBLE.includes(o.delivery.status) && customer ? { name: customer.name, phone: customer.phone } : undefined,
    history: o.delivery.history,
    deliveredAt: o.delivery.status === "DELIVERED" ? [...o.delivery.history].reverse().find((h) => h.label.startsWith("Delivered"))?.at : undefined,
    cashToCollectTzs:
      o.paymentMethod === "cod" && o.paymentStatus === "pending"
        ? breakdown(o.items).merchandiseTzs + o.deliveryFeeTzs
        : 0,
  };
}

/** Only deliveries assigned to this rider. Never the whole order list. */
export function riderJobs(session: Session | null): RiderJobView[] {
  assertRole(session, "rider");
  return demoOrders
    .filter((o) => o.delivery.riderId === session.riderId)
    .sort((a, b) => b.placedAt.localeCompare(a.placedAt))
    .map(toRiderJob);
}

export function riderJob(session: Session | null, orderId: string): RiderJobView | null {
  assertRole(session, "rider");
  const order = demoOrders.find((o) => o.id === orderId);
  return order && order.delivery.riderId === session.riderId ? toRiderJob(order) : null;
}

export interface DemandArea {
  shopName: string;
  geo: LngLat;
  /** Orders at this shop that still need a rider. */
  waiting: number;
}

/**
 * Where riders are needed: shops with orders that have no rider yet.
 * Aggregated counts only; riders never see other customers' details.
 */
export function riderDemandAreas(session: Session | null): DemandArea[] {
  assertRole(session, "rider");
  const counts = new Map<string, number>();
  for (const o of demoOrders) {
    if (o.status === "cancelled" || o.delivery.status !== "PENDING_ASSIGNMENT") continue;
    for (const g of o.groups) counts.set(g.shopId, (counts.get(g.shopId) ?? 0) + 1);
  }
  return [...counts.entries()].flatMap(([shopId, waiting]) => {
    const geo = shopGeo[shopId];
    const shop = demoShops.find((s) => s.id === shopId);
    return geo && shop ? [{ shopName: shop.name, geo, waiting }] : [];
  });
}

export function riderProfile(session: Session | null) {
  assertRole(session, "rider");
  return demoRiders.find((r) => r.id === session.riderId) ?? null;
}

/* ------------------------------ Admin ------------------------------- */

export function adminData(session: Session | null) {
  assertRole(session, "admin");
  return {
    orders: demoOrders,
    shops: demoShops,
    products: demoProducts,
    customers: demoCustomers,
    riders: demoRiders,
  };
}
