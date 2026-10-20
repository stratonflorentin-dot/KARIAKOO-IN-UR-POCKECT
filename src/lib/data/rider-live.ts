import "server-only";

import { assertRole, type Session } from "@/lib/auth/session";
import { ORDER_SELECT, mapOrder } from "@/lib/data/customer-live";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { breakdown } from "@/lib/money";
import type { DeliveryStatus, Order, Rider } from "@/lib/types";

export interface RiderJobView {
  orderId: string;
  reference: string;
  placedAt: string;
  status: DeliveryStatus;
  payoutTzs: number;
  pickups: { shopId: string; shopName: string; address: string; itemCount: number; items: { name: string; quantity: number }[]; ready: boolean; geo?: [number, number] }[];
  zone: Order["zone"];
  dropoffAddress: string;
  instructions?: string;
  history: Order["history"];
  deliveredAt?: string;
  cashToCollectTzs: number;
}

export interface RiderOfferView { orderId: string; payoutTzs: number; expiresAt: string }

export async function riderOffers(session: Session | null): Promise<RiderOfferView[]> {
  assertRole(session, "rider");
  const sb = await createSupabaseServerClient();
  const { data, error } = await sb.from("delivery_offers")
    .select("order_id,payout_tzs,expires_at")
    .eq("rider_id", session.userId)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .order("offered_at", { ascending: true });
  if (error) throw new Error(`Could not load delivery offers: ${error.message}`);
  return ((data ?? []) as { order_id: string; payout_tzs: number; expires_at: string }[]).map((offer) => ({
    orderId: offer.order_id,
    payoutTzs: Number(offer.payout_tzs),
    expiresAt: offer.expires_at,
  }));
}

export async function riderJobs(session: Session | null): Promise<RiderJobView[]> {
  assertRole(session, "rider");
  const sb = await createSupabaseServerClient();
  const { data, error } = await sb.from("orders").select(ORDER_SELECT).order("created_at", { ascending: false });
  if (error) throw new Error(`Could not load rider deliveries: ${error.message}`);
  const orders = (data ?? []).map((row) => mapOrder(row as never)).filter((order) => order.delivery.riderId === session.userId);
  const shopIds = [...new Set(orders.flatMap((order) => order.groups.map((group) => group.shopId)))];
  const { data: shopRows, error: shopError } = shopIds.length
    ? await sb.from("shops").select("id,name,address,lat,lng").in("id", shopIds)
    : { data: [], error: null };
  if (shopError) throw new Error(`Could not load pickup details: ${shopError.message}`);
  const shops = new Map(((shopRows ?? []) as { id: string; name: string; address: string; lat: number | null; lng: number | null }[]).map((shop) => [shop.id, shop]));

  return orders.map((order) => ({
    orderId: order.id,
    reference: order.reference,
    placedAt: order.placedAt,
    status: order.delivery.status,
    payoutTzs: order.delivery.riderPayoutTzs,
    pickups: order.groups.map((group) => {
      const shop = shops.get(group.shopId);
      const lines = order.items.filter((item) => item.shopId === group.shopId);
      return {
        shopId: group.shopId,
        shopName: shop?.name ?? "Pickup location",
        address: shop?.address ?? "",
        itemCount: lines.reduce((sum, item) => sum + item.quantity, 0),
        items: lines.map((item) => ({ name: item.productName, quantity: item.quantity })),
        ready: ["ready_for_pickup", "picked_up", "delivered"].includes(group.status),
        geo: shop?.lat !== null && shop?.lat !== undefined && shop?.lng !== null && shop?.lng !== undefined ? [shop.lng, shop.lat] as [number, number] : undefined,
      };
    }),
    zone: order.zone,
    dropoffAddress: order.address,
    instructions: order.instructions,
    history: order.history,
    deliveredAt: order.delivery.status === "DELIVERED" ? [...order.history].reverse().find((event) => event.label.toLowerCase().includes("deliver"))?.at : undefined,
    cashToCollectTzs: order.paymentMethod === "cod" && order.paymentStatus === "pending" ? breakdown(order.items).merchandiseTzs + order.deliveryFeeTzs : 0,
  }));
}

export async function riderJob(session: Session | null, orderId: string): Promise<RiderJobView | null> {
  assertRole(session, "rider");
  return (await riderJobs(session)).find((job) => job.orderId === orderId) ?? null;
}

export async function riderProfile(session: Session | null): Promise<Rider | null> {
  assertRole(session, "rider");
  const sb = await createSupabaseServerClient();
  const [{ data: riderRows, error: riderError }, { data: profileRows, error: profileError }] = await Promise.all([
    sb.from("riders").select("id,vehicle,plate,base_zone,status,created_at").eq("id", session.userId).limit(1),
    sb.from("profiles").select("full_name,phone").eq("id", session.userId).limit(1),
  ]);
  if (riderError || profileError) throw new Error(`Could not load rider profile: ${riderError?.message ?? profileError?.message}`);
  const rider = (riderRows?.[0] ?? null) as { id: string; vehicle: string; plate: string; base_zone: string; status: Rider["status"]; created_at: string } | null;
  const profile = (profileRows?.[0] ?? null) as { full_name?: string; phone?: string } | null;
  if (!rider) return null;
  return {
    id: rider.id,
    name: profile?.full_name ?? "Rider",
    phone: profile?.phone ?? "",
    vehicle: rider.vehicle,
    plate: rider.plate,
    status: rider.status,
    baseZone: rider.base_zone as Rider["baseZone"],
    rating: 0,
    joinedAt: rider.created_at,
  };
}
