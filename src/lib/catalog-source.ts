import "server-only";

// Loads the public catalog from Supabase, falling back to the demo files if
// Supabase is not configured or can't be reached.
//
// It uses the publishable key with no user session, so Row Level Security
// decides what is returned: only approved shops and their active products.
// Results are cached ("use cache") and refreshed about once a minute.
import { createClient } from "@supabase/supabase-js";
import { cacheLife } from "next/cache";
import { demoProducts } from "@/data/demo/products";
import { demoShops } from "@/data/demo/shops";
import { createCatalog, demoCatalog, getCategories, type Catalog, type CatalogData } from "@/lib/catalog";
import type { CategorySlug, Product, Shop, ShopArea } from "@/lib/types";

export type CatalogSource =
  | { kind: "supabase"; shops: number; products: number }
  | { kind: "demo"; reason: string };

interface LoadResult {
  data: CatalogData | null;
  source: CatalogSource;
}

// Demo rows keep their demo ids and dates (matched by slug), so the demo
// orders and dashboards stay consistent with the catalog in the database.
const legacyShop = new Map(demoShops.map((s) => [s.slug, s]));
const legacyProduct = new Map(demoProducts.map((p) => [p.slug, p]));

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
  created_at: string;
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
  created_at: string;
}

async function loadFromSupabase(): Promise<LoadResult> {
  "use cache";
  cacheLife("minutes");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return { data: null, source: { kind: "demo", reason: "Supabase is not configured" } };

  try {
    const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const [shopsRes, productsRes] = await Promise.all([
      db.from("shops").select("id,slug,name,primary_category,area,address,description,opening_hours,status,verified,rating,review_count,created_at").returns<ShopRow[]>(),
      db.from("products").select("id,shop_id,slug,name,category,price_tzs,compare_at_tzs,stock,unit,description,highlights,status,sold_count,created_at").returns<ProductRow[]>(),
    ]);
    if (shopsRes.error) throw new Error(shopsRes.error.message);
    if (productsRes.error) throw new Error(productsRes.error.message);
    if (!shopsRes.data.length) return { data: null, source: { kind: "demo", reason: "The database has no shops yet" } };

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
      .filter((r) => validCategory.has(r.primary_category))
      .map((r) => {
        const legacy = legacyShop.get(r.slug);
        const id = legacy?.id ?? r.id;
        shopIdByUuid.set(r.id, id);
        const primary = r.primary_category as CategorySlug;
        return {
          id,
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
          joinedYear: legacy?.joinedYear ?? new Date(r.created_at).getUTCFullYear(),
          isDemo: true,
        } satisfies Shop;
      });

    const products: Product[] = productsRes.data
      .filter((r) => shopIdByUuid.has(r.shop_id) && validCategory.has(r.category))
      .map((r) => {
        const legacy = legacyProduct.get(r.slug);
        return {
          id: legacy?.id ?? r.id,
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
          listedAt: legacy?.listedAt ?? r.created_at.slice(0, 10),
          isDemo: true,
        } satisfies Product;
      });

    return {
      data: { categories: getCategories(), shops, products },
      source: { kind: "supabase", shops: shops.length, products: products.length },
    };
  } catch (err) {
    return { data: null, source: { kind: "demo", reason: `Supabase unavailable: ${err instanceof Error ? err.message : "unknown error"}` } };
  }
}

/** The active public catalog: Supabase when available, otherwise demo files. */
export async function getCatalog(): Promise<Catalog> {
  const { data } = await loadFromSupabase();
  return data ? createCatalog(data) : demoCatalog;
}

export async function getCatalogSource(): Promise<CatalogSource> {
  return (await loadFromSupabase()).source;
}
