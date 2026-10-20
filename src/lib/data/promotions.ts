import "server-only";

import { assertRole, type Session } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface ShopPromotion {
  id: string;
  kind: "status" | "teaser" | "branding";
  title: string | null;
  body: string | null;
  imageUrl: string | null;
  linkProductId: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface CustomerPromotion extends ShopPromotion {
  shopName: string;
  shopSlug: string;
  productSlug: string | null;
}

export async function sellerPromotions(session: Session | null, shopId: string): Promise<ShopPromotion[]> {
  assertRole(session, "seller");
  const sb = await createSupabaseServerClient();
  const { data, error } = await sb.from("shop_promotions")
    .select("id,kind,title,body,image_url,link_product_id,expires_at,created_at")
    .eq("shop_id", shopId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Could not load your promotions: ${error.message}`);
  return (data ?? []).map((row) => ({
    id: String(row.id), kind: row.kind as ShopPromotion["kind"], title: row.title,
    body: row.body, imageUrl: row.image_url, linkProductId: row.link_product_id,
    expiresAt: row.expires_at, createdAt: row.created_at,
  }));
}

/** Public promotions are still filtered by the table's RLS policy. */
export async function customerPromotions(): Promise<CustomerPromotion[]> {
  try {
    const sb = await createSupabaseServerClient();
    const { data, error } = await sb.from("shop_promotions")
      .select("id,shop_id,kind,title,body,image_url,link_product_id,expires_at,created_at")
      .order("created_at", { ascending: false })
      .limit(8);
    if (error || !data?.length) return [];
    const shopIds = [...new Set(data.map((row) => row.shop_id))];
    const productIds = [...new Set(data.map((row) => row.link_product_id).filter((id): id is string => Boolean(id)))];
    const [shops, products] = await Promise.all([
      sb.from("shops").select("id,name,slug").in("id", shopIds),
      productIds.length ? sb.from("products").select("id,slug").in("id", productIds).eq("status", "active") : Promise.resolve({ data: [], error: null }),
    ]);
    if (shops.error) return [];
    const shopById = new Map((shops.data ?? []).map((row) => [row.id, row]));
    const productById = new Map((products.data ?? []).map((row) => [row.id, row.slug]));
    return data.flatMap((row) => {
      const shop = shopById.get(row.shop_id);
      if (!shop) return [];
      return [{
        id: String(row.id), kind: row.kind as ShopPromotion["kind"], title: row.title,
        body: row.body, imageUrl: row.image_url, linkProductId: row.link_product_id,
        expiresAt: row.expires_at, createdAt: row.created_at,
        shopName: shop.name, shopSlug: shop.slug,
        productSlug: row.link_product_id ? productById.get(row.link_product_id) ?? null : null,
      }];
    });
  } catch {
    return [];
  }
}
