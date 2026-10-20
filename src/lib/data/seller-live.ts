import "server-only";

// Live seller data: the signed-in seller's own shop and products, read straight
// from Supabase with their true UUIDs. RLS ("owner reads own") authorises these reads; the write path
// in src/app/seller/products/actions.ts relies on the matching owner policies.
import { assertRole, type Session } from "@/lib/auth/session";
import { isAudience, isProductType } from "@/lib/departments";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Audience, CategorySlug, ProductStatus, ProductType } from "@/lib/types";
import type { DeliveryStatus, FulfillmentStatus, PaymentStatus, SettlementStatus } from "@/lib/types";

export interface SellerShopLive {
  id: string;
  name: string;
  slug: string;
  primaryCategory: string;
  status: string;
}

export interface SellerProductLive {
  id: string;
  slug: string;
  name: string;
  category: CategorySlug;
  priceTzs: number;
  stock: number;
  status: ProductStatus;
  description: string;
  audience?: Audience;
  productType?: ProductType;
  imageUrl?: string;
}

export interface SellerOrderLive {
  orderId: string;
  reference: string;
  placedAt: string;
  paymentStatus: PaymentStatus;
  zone: string;
  deliveryStatus: DeliveryStatus;
  fulfillmentStatus: FulfillmentStatus;
  settlementStatus: SettlementStatus;
  items: { productId: string; productName: string; unitPriceTzs: number; quantity: number; commissionBps: number; commissionTzs: number }[];
  merchandiseTzs: number;
  commissionTzs: number;
}

/** Secure RPC returns shop-only order data and deliberately omits customer contact details. */
export async function liveSellerOrders(session: Session | null, shopId: string): Promise<SellerOrderLive[]> {
  assertRole(session, "seller");
  const sb = await createSupabaseServerClient();
  const { data, error } = await sb.rpc("seller_order_feed", { p_shop: shopId });
  if (error) throw new Error(`Could not load seller orders: ${error.message}`);
  return ((data ?? []) as unknown as {
    order_id: string; reference: string; placed_at: string; payment_status: string; zone: string;
    delivery_status: string; fulfillment_status: string; settlement_status: string;
    items: { productId: string; productName: string; unitPriceTzs: number; quantity: number; commissionBps: number; commissionTzs: number }[];
    merchandise_tzs: number; commission_tzs: number;
  }[]).map((row) => ({
    orderId: row.order_id,
    reference: row.reference,
    placedAt: row.placed_at,
    paymentStatus: row.payment_status as PaymentStatus,
    zone: row.zone,
    deliveryStatus: row.delivery_status as DeliveryStatus,
    fulfillmentStatus: row.fulfillment_status as FulfillmentStatus,
    settlementStatus: row.settlement_status as SettlementStatus,
    items: row.items ?? [],
    merchandiseTzs: Number(row.merchandise_tzs),
    commissionTzs: Number(row.commission_tzs),
  }));
}

/** The signed-in seller's shop, or null if they have none / on error. */
export async function liveSellerShop(session: Session | null): Promise<SellerShopLive | null> {
  assertRole(session, "seller");
  try {
    const sb = await createSupabaseServerClient();
    const { data } = await sb
      .from("shops")
      .select("id,name,slug,primary_category,status")
      .eq("owner_id", session.userId)
      .limit(1);
    const r = data?.[0] as Record<string, unknown> | undefined;
    if (!r) return null;
    return {
      id: String(r.id),
      name: String(r.name ?? ""),
      slug: String(r.slug ?? ""),
      primaryCategory: String(r.primary_category ?? ""),
      status: String(r.status ?? "pending"),
    };
  } catch {
    return null;
  }
}

/** The seller's own products (every status), newest first. Empty on error. */
export async function liveSellerProducts(session: Session | null, shopId: string): Promise<SellerProductLive[]> {
  assertRole(session, "seller");
  try {
    const sb = await createSupabaseServerClient();
    const { data, error } = await sb
      .from("products")
      .select("id,slug,name,category,price_tzs,stock,status,description,audience,product_type,image_url")
      .eq("shop_id", shopId)
      .order("created_at", { ascending: false });
    if (error || !data) return [];
    return (data as Record<string, unknown>[]).map((r) => ({
      id: String(r.id),
      slug: String(r.slug ?? ""),
      name: String(r.name ?? ""),
      category: String(r.category ?? "") as CategorySlug,
      priceTzs: Number(r.price_tzs ?? 0),
      stock: Number(r.stock ?? 0),
      status: (r.status === "archived" ? "archived" : "active") as ProductStatus,
      description: String(r.description ?? ""),
      audience: isAudience(r.audience) ? r.audience : undefined,
      productType: isProductType(r.product_type) ? r.product_type : undefined,
      imageUrl: r.image_url ? String(r.image_url) : undefined,
    }));
  } catch {
    return [];
  }
}

export async function liveSellerSummary(session: Session | null, shopId: string) {
  assertRole(session, "seller");
  const sb = await createSupabaseServerClient();
  const [products, groups] = await Promise.all([
    sb.from("products").select("id,stock,status", { count: "exact" }).eq("shop_id", shopId),
    sb.from("fulfillment_groups").select("order_id,status").eq("shop_id", shopId),
  ]);
  if (products.error) throw new Error(`Could not load seller products: ${products.error.message}`);
  if (groups.error) throw new Error(`Could not load seller orders: ${groups.error.message}`);
  const rows = (products.data ?? []) as { id: string; stock: number; status: string }[];
  const groupRows = (groups.data ?? []) as { order_id: string; status: string }[];
  return {
    productCount: rows.length,
    activeProducts: rows.filter((p) => p.status === "active").length,
    lowStock: rows.filter((p) => p.status === "active" && p.stock <= 5).length,
    orderCount: new Set(groupRows.map((g) => g.order_id)).size,
    pendingOrders: groupRows.filter((g) => ["awaiting_seller", "accepted", "preparing"].includes(g.status)).length,
  };
}
