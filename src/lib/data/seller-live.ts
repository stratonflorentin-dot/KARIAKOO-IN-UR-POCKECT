import "server-only";

// Live seller data: the signed-in seller's own shop and products, read straight
// from Supabase with their true UUIDs (not the demo-id rewriting the public
// catalog does). RLS ("owner reads own") authorises these reads; the write path
// in src/app/seller/products/actions.ts relies on the matching owner policies.
import { assertRole, type Session } from "@/lib/auth/session";
import { isAudience, isProductType } from "@/lib/departments";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Audience, CategorySlug, ProductStatus, ProductType } from "@/lib/types";

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
