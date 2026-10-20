"use server";

// Real product management for the signed-in seller. Everything here writes to
// the live products table under the "owner inserts / owner or admin updates"
// RLS policies, which are the real authority — we also look the shop up by
// owner_id so a seller can only ever touch their own shop's products.
//
// Photos are not uploaded yet: image upload to Supabase Storage is the next
// step. Products publish without a photo for now (a placeholder is shown).
import { revalidatePath } from "next/cache";
import { getSessionWithRole } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { productDraftSchema } from "@/lib/validation/product";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface ProductActionResult {
  ok: boolean;
  error?: string;
  id?: string;
  slug?: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A unique products.slug (^[a-z0-9-]{3,120}$) from the product name. */
async function uniqueProductSlug(sb: SupabaseClient, name: string): Promise<string> {
  let stem = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 110);
  if (stem.length < 2) stem = "product";
  for (let i = 0; i < 6; i++) {
    const candidate = `${stem}-${Math.floor(1000 + Math.random() * 9000)}`;
    const { data } = await sb.from("products").select("id").eq("slug", candidate).limit(1);
    if (!data || data.length === 0) return candidate;
  }
  return `${stem}-${Date.now().toString().slice(-6)}`;
}

/** The signed-in seller plus their shop id, or an error result. */
async function sellerShopId(sb: SupabaseClient): Promise<{ shopId: string } | { error: string }> {
  const session = await getSessionWithRole("seller");
  if (!session) return { error: "Please sign in as a seller." };
  const { data } = await sb.from("shops").select("id").eq("owner_id", session.userId).limit(1);
  const shopId = (data?.[0] as { id?: string } | undefined)?.id;
  if (!shopId) return { error: "You don't have a shop yet. Apply to sell first." };
  return { shopId };
}

export async function createProduct(formData: FormData): Promise<ProductActionResult> {
  const sb = await createSupabaseServerClient();
  const shop = await sellerShopId(sb);
  if ("error" in shop) return { ok: false, error: shop.error };

  const parsed = productDraftSchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category"),
    audience: formData.get("audience") || undefined,
    productType: formData.get("productType") || undefined,
    priceTzs: formData.get("priceTzs"),
    stock: formData.get("stock"),
    description: formData.get("description"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the product details." };
  const d = parsed.data;

  const slug = await uniqueProductSlug(sb, d.name);
  const { data, error } = await sb
    .from("products")
    .insert({
      shop_id: shop.shopId,
      slug,
      name: d.name,
      category: d.category,
      price_tzs: d.priceTzs,
      stock: d.stock,
      description: d.description,
      audience: d.audience ?? null,
      product_type: d.productType ?? null,
      status: "active",
      is_demo: false,
    })
    .select("id,slug")
    .limit(1);
  if (error || !data?.[0]) return { ok: false, error: error?.message ?? "Could not save the product." };

  revalidatePath("/seller/products");
  return { ok: true, id: String((data[0] as { id: string }).id), slug: String((data[0] as { slug: string }).slug) };
}

/** Update a product's price and stock. */
export async function saveProductFields(formData: FormData): Promise<ProductActionResult> {
  const id = String(formData.get("id") ?? "");
  const priceTzs = Math.round(Number(formData.get("priceTzs")));
  const stock = Math.round(Number(formData.get("stock")));
  if (!UUID.test(id)) return { ok: false, error: "Unknown product." };
  if (!Number.isFinite(priceTzs) || priceTzs < 100 || priceTzs > 50_000_000) return { ok: false, error: "Price must be TSh 100–50,000,000." };
  if (!Number.isFinite(stock) || stock < 0 || stock > 100_000) return { ok: false, error: "Stock must be 0–100,000." };

  const sb = await createSupabaseServerClient();
  const shop = await sellerShopId(sb);
  if ("error" in shop) return { ok: false, error: shop.error };

  const { error } = await sb.from("products").update({ price_tzs: priceTzs, stock }).eq("id", id).eq("shop_id", shop.shopId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/seller/products");
  return { ok: true };
}

/** Archive or restore a product. */
export async function setProductStatus(formData: FormData): Promise<ProductActionResult> {
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!UUID.test(id)) return { ok: false, error: "Unknown product." };
  if (status !== "active" && status !== "archived") return { ok: false, error: "Unknown status." };

  const sb = await createSupabaseServerClient();
  const shop = await sellerShopId(sb);
  if ("error" in shop) return { ok: false, error: shop.error };

  const { error } = await sb.from("products").update({ status }).eq("id", id).eq("shop_id", shop.shopId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/seller/products");
  return { ok: true };
}
