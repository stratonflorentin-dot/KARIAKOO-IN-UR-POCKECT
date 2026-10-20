import "server-only";

import { assertRole, type Session } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CommissionRule } from "@/lib/types";
import { ORDER_SELECT, mapOrder } from "@/lib/data/customer-live";
import type { Order } from "@/lib/types";

export interface AdminOverviewLive {
  orders: number;
  shops: number;
  products: number;
  customers: number;
  riders: number;
  pendingOrders: number;
  pendingShops: number;
  pendingRiders: number;
  paidGmvTzs: number;
  recent: { id: string; reference: string; createdAt: string; paymentStatus: string; totalTzs: number }[];
}

/** Read marketplace overview through the caller's admin-scoped Supabase session. */
export async function liveAdminOverview(session: Session | null): Promise<AdminOverviewLive> {
  assertRole(session, "admin");
  const sb = await createSupabaseServerClient();
  const [orders, shops, products, customers, riders, pendingGroups, pendingShops, pendingRiders, recentOrders] = await Promise.all([
    sb.from("orders").select("id", { count: "exact", head: true }),
    sb.from("shops").select("id", { count: "exact", head: true }).eq("is_demo", false),
    sb.from("products").select("id", { count: "exact", head: true }).eq("status", "active").eq("is_demo", false),
    sb.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "customer"),
    sb.from("riders").select("id", { count: "exact", head: true }).eq("status", "approved"),
    sb.from("fulfillment_groups").select("order_id", { count: "exact", head: true }).eq("status", "awaiting_seller"),
    sb.from("shops").select("id", { count: "exact", head: true }).eq("is_demo", false).neq("status", "approved"),
    sb.from("riders").select("id", { count: "exact", head: true }).eq("status", "pending"),
    sb.from("orders").select("id,reference,created_at,payment_status,order_items(unit_price_tzs,quantity),fulfillment_groups(status)").order("created_at", { ascending: false }).limit(6),
  ]);
  const failed = [orders, shops, products, customers, riders, pendingGroups, pendingShops, pendingRiders, recentOrders].find((r) => r.error);
  if (failed?.error) throw new Error(`Could not load admin overview: ${failed.error.message}`);

  const rows = (recentOrders.data ?? []) as unknown as {
    id: string; reference: string; created_at: string; payment_status: string;
    order_items: { unit_price_tzs: number; quantity: number }[];
  }[];
  return {
    orders: orders.count ?? 0,
    shops: shops.count ?? 0,
    products: products.count ?? 0,
    customers: customers.count ?? 0,
    riders: riders.count ?? 0,
    pendingOrders: pendingGroups.count ?? 0,
    pendingShops: pendingShops.count ?? 0,
    pendingRiders: pendingRiders.count ?? 0,
    paidGmvTzs: rows.filter((r) => r.payment_status === "successful").reduce((sum, r) => sum + r.order_items.reduce((n, i) => n + Number(i.unit_price_tzs) * i.quantity, 0), 0),
    recent: rows.map((r) => ({ id: r.id, reference: r.reference, createdAt: r.created_at, paymentStatus: r.payment_status, totalTzs: r.order_items.reduce((n, i) => n + Number(i.unit_price_tzs) * i.quantity, 0) })),
  };
}

export async function liveAdminCommissionRules(session: Session | null): Promise<CommissionRule[]> {
  assertRole(session, "admin");
  const sb = await createSupabaseServerClient();
  const { data, error } = await sb.from("commission_rules")
    .select("id,scope,target_shop_id,target_category,rate_bps,effective_from,note,created_by")
    .order("effective_from", { ascending: false });
  if (error) throw new Error(`Could not load commission rules: ${error.message}`);
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: String(r.id),
    scope: r.scope as CommissionRule["scope"],
    target: r.scope === "shop" ? String(r.target_shop_id) : r.scope === "category" ? String(r.target_category) : undefined,
    rateBps: Number(r.rate_bps),
    effectiveFrom: String(r.effective_from),
    note: String(r.note ?? ""),
    createdBy: String(r.created_by ?? ""),
  }));
}

export async function liveAdminOrders(session: Session | null): Promise<Order[]> {
  assertRole(session, "admin");
  const sb = await createSupabaseServerClient();
  const { data, error } = await sb.from("orders").select(ORDER_SELECT).order("created_at", { ascending: false });
  if (error) throw new Error(`Could not load admin orders: ${error.message}`);
  return (data ?? []).map((row) => mapOrder(row as never));
}
