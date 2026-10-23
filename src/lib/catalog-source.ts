import "server-only";

// Loads the public catalog from Supabase. An empty or unavailable database
// stays empty; production pages never substitute sample listings.
//
// It uses the publishable key with no user session, so Row Level Security
// decides what is returned: only approved shops and their active products.
// Results are cached ("use cache") and refreshed about once a minute.
import { createClient } from "@supabase/supabase-js";
import { cacheLife, cacheTag } from "next/cache";
import { createCatalog, getCategories, type Catalog, type CatalogData } from "@/lib/catalog";
import { isAudience, isProductType } from "@/lib/departments";
import type { CategorySlug, Product, Shop, ShopArea } from "@/lib/types";

export type CatalogSource =
  | { kind: "supabase"; shops: number; products: number }
  | { kind: "unavailable"; reason: string };

interface LoadResult {
  data: CatalogData | null;
  source: CatalogSource;
}

const AREAS: ShopArea[] = ["kariakoo", "posta", "sinza", "mwenge"];

interface ShopRow {
  id: string;
  slug: string;
  name: string;
  primary_category: string;
  area: string;
  address: string;
  description: string;
  opening_hours: string;
  status: Shop["status"];
  verified: boolean;
  rating: number;
  review_count: number;
  lat: number | null;
  lng: number | null;
  created_at: string;
  is_demo: boolean;
}

interface ProductRow {
  id: string;
  shop_id: string;
  slug: string;
  name: string;
  category: string;
  price_tzs: number;
  compare_at_tzs: number | null;
  stock: number;
  unit: string;
  description: string;
  highlights: string[];
  status: Product["status"];
  sold_count: number;
  audience: string | null;
  product_type: string | null;
  image_url: string | null;
  created_at: string;
  is_demo: boolean;
}

async function loadFromSupabase(): Promise<LoadResult> {
  "use cache";
  cacheLife("minutes");
  cacheTag("public-catalog");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return { data: null, source: { kind: "unavailable", reason: "Marketplace data is not configured." } };

  try {
    const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const [shopsRes, productsRes] = await Promise.all([
      db.from("shops").select("id,slug,name,primary_category,area,address,description,opening_hours,status,verified,rating,review_count,lat,lng,created_at,is_demo").eq("is_demo", false).returns<ShopRow[]>(),
      db.from("products").select("id,shop_id,slug,name,category,price_tzs,compare_at_tzs,stock,unit,description,highlights,status,sold_count,audience,product_type,image_url,created_at,is_demo").eq("is_demo", false).returns<ProductRow[]>(),
    ]);
    if (shopsRes.error) throw new Error(shopsRes.error.message);
    if (productsRes.error) throw new Error(productsRes.error.message);
    const validCategory = new Set<string>(getCategories().map((c) => c.slug));
    const shopIdByUuid = new Map<string, string>();

    // Each shop's categories: its primary category first, then any others its products use.
    const productCats = new Map<string, Set<CategorySlug>>();
    for (const p of productsRes.data) {
      if (!validCategory.has(p.category)) continue;
      const set = productCats.get(p.shop_id) ?? new Set();
      set.add(p.category as CategorySlug);
      productCats.set(p.shop_id, set);
    }

    const shops: Shop[] = shopsRes.data
      .filter((r) => !r.is_demo && validCategory.has(r.primary_category))
      .map((r) => {
        shopIdByUuid.set(r.id, r.id);
        const primary = r.primary_category as CategorySlug;
        return {
          id: r.id,
          slug: r.slug,
          name: r.name,
          area: AREAS.includes(r.area as ShopArea) ? (r.area as ShopArea) : "kariakoo",
          address: r.address,
          description: r.description,
          categories: [primary, ...[...(productCats.get(r.id) ?? [])].filter((c) => c !== primary)],
          rating: Number(r.rating),
          reviewCount: r.review_count,
          verified: r.verified,
          status: r.status,
          openingHours: r.opening_hours,
          joinedYear: new Date(r.created_at).getUTCFullYear(),
          geo: r.lat !== null && r.lng !== null ? [r.lng, r.lat] : undefined,
        } satisfies Shop;
      });

    const products: Product[] = productsRes.data
      .filter((r) => !r.is_demo && shopIdByUuid.has(r.shop_id) && validCategory.has(r.category))
      .map((r) => {
        return {
          id: r.id,
          slug: r.slug,
          name: r.name,
          shopId: shopIdByUuid.get(r.shop_id)!,
          category: r.category as CategorySlug,
          priceTzs: Number(r.price_tzs),
          compareAtTzs: r.compare_at_tzs === null ? undefined : Number(r.compare_at_tzs),
          stock: r.stock,
          unit: r.unit,
          description: r.description,
          highlights: r.highlights,
          status: r.status,
          soldCount: r.sold_count,
          listedAt: r.created_at.slice(0, 10),
          audience: isAudience(r.audience) ? r.audience : undefined,
          productType: isProductType(r.product_type) ? r.product_type : undefined,
          imageUrl: r.image_url ?? undefined,
        } satisfies Product;
      });

    return {
      data: { categories: getCategories(), shops, products },
      source: { kind: "supabase", shops: shops.length, products: products.length },
    };
  } catch {
    return { data: null, source: { kind: "unavailable", reason: "Marketplace listings could not be loaded." } };
  }
}

/** The active public catalog. Missing live data produces an empty catalog. */
export async function getCatalog(): Promise<Catalog> {
  const { data } = await loadFromSupabase();
  return createCatalog(data ?? { categories: getCategories(), shops: [], products: [] });
}

export async function getCatalogSource(): Promise<CatalogSource> {
  return (await loadFromSupabase()).source;
}
