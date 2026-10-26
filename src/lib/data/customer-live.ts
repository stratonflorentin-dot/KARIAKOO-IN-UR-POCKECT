import "server-only";

// Live customer orders, read from Supabase for the signed-in customer. RLS
// (customers read their own orders / items / delivery / pins) is the authority.
// These map the DB rows onto the shared Order type the order pages already use.
import { assertRole, type Session } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { DeliveryStatus, FulfillmentStatus, Order, OrderStatus, PaymentMethod, PaymentStatus, SettlementStatus, StatusEvent } from "@/lib/types";

interface OrderRow {
  id: string;
  reference: string;
  customer_id: string;
  zone: string;
  address: string;
  instructions: string;
  status: string;
  payment_status: string;
  payment_method: string;
  delivery_fee_tzs: number;
  created_at: string;
  order_items: ItemRow[];
  fulfillment_groups: GroupRow[];
  deliveries: DeliveryRow | DeliveryRow[] | null;
  order_status_history: HistoryRow[];
}
interface ItemRow { product_id: string; shop_id: string; product_name: string; unit_price_tzs: number; quantity: number; commission_bps: number }
interface GroupRow { shop_id: string; status: string; settlement_status: string; rejection_reason: string | null }
interface DeliveryRow { status: string; rider_id: string | null; rider_payout_tzs: number }
interface HistoryRow { label: string; actor: string; created_at: string }

export const ORDER_SELECT =
  "id,reference,customer_id,zone,address,instructions,status,payment_status,payment_method,delivery_fee_tzs,created_at," +
  "order_items(product_id,shop_id,product_name,unit_price_tzs,quantity,commission_bps)," +
  "fulfillment_groups(shop_id,status,settlement_status,rejection_reason)," +
  "deliveries(status,rider_id,rider_payout_tzs)," +
  "order_status_history(label,actor,created_at)";

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export function mapOrder(r: OrderRow): Order {
  const d = one(r.deliveries);
  const history: StatusEvent[] = [...(r.order_status_history ?? [])]
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((h) => ({ label: h.label, at: h.created_at, actor: h.actor as StatusEvent["actor"] }));
  return {
    id: r.id,
    reference: r.reference,
    customerId: r.customer_id,
    placedAt: r.created_at,
    zone: r.zone as Order["zone"],
    address: r.address,
    instructions: r.instructions || undefined,
    status: r.status as OrderStatus,
    paymentStatus: r.payment_status as PaymentStatus,
    paymentMethod: r.payment_method as PaymentMethod,
    deliveryFeeTzs: Number(r.delivery_fee_tzs),
    items: (r.order_items ?? []).map((i) => ({
      productId: i.product_id,
      shopId: i.shop_id,
      productName: i.product_name,
      unitPriceTzs: Number(i.unit_price_tzs),
      quantity: i.quantity,
      commissionBps: i.commission_bps,
    })),
    groups: (r.fulfillment_groups ?? []).map((g) => ({
      shopId: g.shop_id,
      status: g.status as FulfillmentStatus,
      settlement: g.settlement_status as SettlementStatus,
      rejectionReason: g.rejection_reason ?? undefined,
    })),
    delivery: {
      status: (d?.status ?? "PENDING_ASSIGNMENT") as DeliveryStatus,
      riderId: d?.rider_id ?? undefined,
      riderPayoutTzs: Number(d?.rider_payout_tzs ?? 0),
      history: [],
    },
    history,
  };
}

/** The customer's orders, newest first. Empty on error. */
export async function liveCustomerOrders(session: Session | null): Promise<Order[]> {
  assertRole(session, "customer");
  try {
    const sb = await createSupabaseServerClient();
    const { data, error } = await sb
      .from("orders")
      .select(ORDER_SELECT)
      .eq("customer_id", session.userId)
      .order("created_at", { ascending: false });
    if (error || !data) return [];
    return (data as unknown as OrderRow[]).map(mapOrder).filter((o) => o.items.length > 0);
  } catch {
    return [];
  }
}

export interface CustomerOrderDetail {
  order: Order;
  shopNames: Record<string, string>;
  pin: string | null;
  riderName: string | null;
  riderVehicle?: string | null;
  riderPlate?: string | null;
}

/** One order for its customer, with shop names, PIN and rider name. Null if not theirs. */
export async function liveCustomerOrder(session: Session | null, orderId: string): Promise<CustomerOrderDetail | null> {
  assertRole(session, "customer");
  try {
    const sb = await createSupabaseServerClient();
    const { data, error } = await sb.from("orders").select(ORDER_SELECT).eq("id", orderId).limit(1);
    if (error || !data?.[0]) return null;
    const order = mapOrder(data[0] as unknown as OrderRow);
    // RLS already restricts to the caller's orders, but double-check ownership.
    if (order.customerId !== session.userId) return null;

    const shopIds = [...new Set(order.groups.map((g) => g.shopId))];
    const shopNames: Record<string, string> = {};
    if (shopIds.length > 0) {
      const { data: shops } = await sb.from("shops").select("id,name").in("id", shopIds);
      for (const s of (shops ?? []) as { id: string; name: string }[]) shopNames[s.id] = s.name;
    }

    const { data: pinRow } = await sb.from("delivery_pins").select("pin").eq("order_id", orderId).limit(1);
    const pin = (pinRow?.[0] as { pin?: string } | undefined)?.pin ?? null;

    let riderName: string | null = null;
    let riderVehicle: string | null = null;
    let riderPlate: string | null = null;
    if (order.delivery.riderId) {
      const [{ data: prof }, { data: riderRow }] = await Promise.all([
        sb.from("profiles").select("full_name").eq("id", order.delivery.riderId).limit(1),
        sb.from("riders").select("vehicle,plate").eq("id", order.delivery.riderId).limit(1),
      ]);
      riderName = ((prof?.[0] as { full_name?: string } | undefined)?.full_name ?? "").trim() || null;
      if (riderRow?.[0]) {
        riderVehicle = (riderRow[0] as { vehicle?: string }).vehicle ?? null;
        riderPlate = (riderRow[0] as { plate?: string }).plate ?? null;
      }
    }

    return { order, shopNames, pin, riderName, riderVehicle, riderPlate };
  } catch {
    return null;
  }
}
