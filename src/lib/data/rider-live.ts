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
  dropoffGeo?: [number, number];
  instructions?: string;
  history: Order["history"];
  deliveredAt?: string;
  cashToCollectTzs: number;
}

export interface RiderOfferView { orderId: string; payoutTzs: number; expiresAt: string; instructions?: string }
export interface RiderAvailableDelivery {
  orderId: string;
  reference: string;
  placedAt: string;
  payoutTzs: number;
  pickupNames: string;
  distanceKm: number | null;
  canClaim: boolean;
}

export async function riderAvailableDeliveries(session: Session | null): Promise<{
  deliveries: RiderAvailableDelivery[];
  unavailable: boolean;
}> {
  assertRole(session, "rider");
  const sb = await createSupabaseServerClient();
  const { data, error } = await sb.rpc("rider_available_deliveries");
  // Keep the entire rider dashboard usable during a staggered frontend / DB
  // deploy. The board appears as soon as this RPC migration is applied.
  if (error) return { deliveries: [], unavailable: true };
  const deliveries = ((data ?? []) as {
    order_id: string; reference: string; placed_at: string; payout_tzs: number | string;
    pickup_names: string; distance_km: number | null; can_claim: boolean;
  }[]).map((row) => ({
    orderId: row.order_id,
    reference: row.reference,
    placedAt: row.placed_at,
    payoutTzs: Number(row.payout_tzs),
    pickupNames: row.pickup_names,
    distanceKm: row.distance_km === null ? null : Number(row.distance_km),
    canClaim: row.can_claim,
  }));
  return { deliveries, unavailable: false };
}

export async function riderOffers(session: Session | null): Promise<RiderOfferView[]> {
  assertRole(session, "rider");
  const sb = await createSupabaseServerClient();
  const { error: dispatchError } = await sb.rpc("rider_refresh_offers");
  if (dispatchError) throw new Error(`Could not refresh delivery offers: ${dispatchError.message}`);
  const { data, error } = await sb.from("delivery_offers")
    .select("order_id,payout_tzs,expires_at")
    .eq("rider_id", session.userId)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .order("offered_at", { ascending: true });
  if (error) throw new Error(`Could not load delivery offers: ${error.message}`);
  // The chosen transport vehicle (non-sensitive) for each pending offer, so the
  // offer card shows the real vehicle instead of guessing it from the payout.
  const { data: vehRows } = await sb.rpc("rider_offer_vehicles");
  const vehicleByOrder = new Map(
    ((vehRows ?? []) as { order_id: string; vehicle: string | null }[])
      .filter((r) => r.vehicle)
      .map((r) => [r.order_id, r.vehicle as string]),
  );
  return ((data ?? []) as { order_id: string; payout_tzs: number; expires_at: string }[]).map((offer) => {
    const vehicle = vehicleByOrder.get(offer.order_id);
    return {
      orderId: offer.order_id,
      payoutTzs: Number(offer.payout_tzs),
      expiresAt: offer.expires_at,
      // The offer modal parses this marker to show the real vehicle.
      instructions: vehicle ? `[Usafiri: ${vehicle}]` : undefined,
    };
  });
}

export async function riderJobs(session: Session | null): Promise<RiderJobView[]> {
  assertRole(session, "rider");
  const sb = await createSupabaseServerClient();
  const { data, error } = await sb.from("orders").select(ORDER_SELECT).order("created_at", { ascending: false });
  if (error) throw new Error(`Could not load rider deliveries: ${error.message}`);
  const rows = (data ?? []) as unknown as ({ id: string } & Record<string, unknown>)[];
  const orders = rows.map((row) => mapOrder(row as never)).filter((order) => order.delivery.riderId === session.userId);
  const orderIds = orders.map((order) => order.id);
  const { data: dropoffRows, error: dropoffError } = orderIds.length
    ? await sb.from("order_dropoff_locations").select("order_id,lat,lng").in("order_id", orderIds)
    : { data: [], error: null };
  if (dropoffError) throw new Error(`Could not load delivery locations: ${dropoffError.message}`);
  const dropoffByOrderId = new Map(((dropoffRows ?? []) as { order_id: string; lat: number; lng: number }[]).map((row) => [row.order_id, [row.lng, row.lat] as [number, number]]));
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
    dropoffGeo: dropoffByOrderId.get(order.id),
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
