// Read-only public catalog. Today it reads demo data; in Phase 2 these
// functions will query Supabase (through RLS) and nothing else changes.
import { demoCategories } from "@/data/demo/categories";
import { demoProducts } from "@/data/demo/products";
import { demoShops } from "@/data/demo/shops";
import type { Category, CategorySlug, Product, Shop, ShopArea } from "@/lib/types";

/** Only approved shops are visible to customers. */
const publicShops = demoShops.filter((s) => s.status === "approved");
const publicShopIds = new Set(publicShops.map((s) => s.id));
/** Only active products from approved shops are visible to customers. */
const publicProducts = demoProducts.filter((p) => p.status === "active" && publicShopIds.has(p.shopId));

export function getCategories(): Category[] {
  return demoCategories;
}

export function getCategory(slug: string): Category | undefined {
  return demoCategories.find((c) => c.slug === slug);
}

export function getShops(): Shop[] {
  return publicShops;
}

export function getShop(slugOrId: string): Shop | undefined {
  return publicShops.find((s) => s.slug === slugOrId || s.id === slugOrId);
}

export function getProducts(): Product[] {
  return publicProducts;
}

export function getProduct(slugOrId: string): Product | undefined {
  return publicProducts.find((p) => p.slug === slugOrId || p.id === slugOrId);
}

export function getProductsByCategory(slug: string): Product[] {
  return publicProducts.filter((p) => p.category === slug);
}

export function getProductsByShop(shopId: string): Product[] {
  return publicProducts.filter((p) => p.shopId === shopId);
}

export function getShopName(shopId: string): string {
  return demoShops.find((s) => s.id === shopId)?.name ?? "Unknown shop";
}

export function getShopArea(shopId: string): ShopArea | undefined {
  return demoShops.find((s) => s.id === shopId)?.area;
}

export type StockLevel = "out" | "low" | "in";

export function stockLevel(stock: number): StockLevel {
  if (stock <= 0) return "out";
  if (stock <= 5) return "low";
  return "in";
}

export function isOnOffer(p: Product): boolean {
  return p.compareAtTzs !== undefined && p.compareAtTzs > p.priceTzs;
}

/* ---------------------------- Search ---------------------------- */

export type SortOption = "relevance" | "price-asc" | "price-desc" | "popular" | "newest";

export interface ProductFilters {
  q?: string;
  category?: CategorySlug;
  area?: ShopArea;
  shopId?: string;
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
  sort?: SortOption;
  page?: number;
  pageSize?: number;
}

export interface ProductSearchResult {
  items: Product[];
  total: number;
  page: number;
  pageCount: number;
}

function normalise(text: string): string {
  return text.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");
}

function termsOf(query: string | undefined): string[] {
  return normalise(query ?? "").split(/\s+/).filter(Boolean).slice(0, 8);
}

function productHaystack(p: Product): string {
  const c = getCategory(p.category);
  return normalise([p.name, p.description, getShopName(p.shopId), c?.name, c?.nameSw].join(" "));
}

/** Pure, testable product search with filters, sorting and pagination. */
export function searchProducts(filters: ProductFilters, source: Product[] = publicProducts): ProductSearchResult {
  const terms = termsOf(filters.q);
  const pageSize = Math.min(Math.max(filters.pageSize ?? 12, 1), 48);

  let items = source.filter((p) => {
    if (filters.category && p.category !== filters.category) return false;
    if (filters.shopId && p.shopId !== filters.shopId) return false;
    if (filters.area && getShopArea(p.shopId) !== filters.area) return false;
    if (filters.minPrice !== undefined && p.priceTzs < filters.minPrice) return false;
    if (filters.maxPrice !== undefined && p.priceTzs > filters.maxPrice) return false;
    if (filters.inStockOnly && p.stock <= 0) return false;
    if (terms.length > 0) {
      const text = productHaystack(p);
      if (!terms.every((t) => text.includes(t))) return false;
    }
    return true;
  });

  const sort = filters.sort ?? "relevance";
  const byName = (a: Product, b: Product) => a.name.localeCompare(b.name);
  const sorters: Record<SortOption, (a: Product, b: Product) => number> = {
    // Relevance: name matches first, then popularity.
    relevance: (a, b) => {
      const score = (p: Product) => (terms.length && terms.every((t) => normalise(p.name).includes(t)) ? 1 : 0);
      return score(b) - score(a) || b.soldCount - a.soldCount || byName(a, b);
    },
    "price-asc": (a, b) => a.priceTzs - b.priceTzs || byName(a, b),
    "price-desc": (a, b) => b.priceTzs - a.priceTzs || byName(a, b),
    popular: (a, b) => b.soldCount - a.soldCount || byName(a, b),
    newest: (a, b) => b.listedAt.localeCompare(a.listedAt) || byName(a, b),
  };
  items = [...items].sort(sorters[sort]);

  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(Math.floor(filters.page ?? 1), 1), pageCount);
  return { items: items.slice((page - 1) * pageSize, page * pageSize), total, page, pageCount };
}

export function searchShops(query: string): Shop[] {
  const terms = termsOf(query);
  if (terms.length === 0) return [];
  return publicShops.filter((s) => {
    const text = normalise([s.name, s.address, s.description, ...s.categories.map((c) => getCategory(c)?.name)].join(" "));
    return terms.every((t) => text.includes(t));
  });
}

const SORTS: SortOption[] = ["relevance", "price-asc", "price-desc", "popular", "newest"];
const AREAS: ShopArea[] = ["kariakoo", "posta", "sinza", "mwenge"];

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

function toPrice(v: string | undefined): number | undefined {
  if (!v) return undefined;
  const n = Number(v.replace(/[,\s]/g, ""));
  return Number.isSafeInteger(n) && n >= 0 ? n : undefined;
}

/** Parse untrusted URL search params into safe, typed filters. */
export function parseProductFilters(params: Record<string, string | string[] | undefined>): ProductFilters {
  const category = first(params.category);
  const area = first(params.area);
  const sort = first(params.sort);
  const page = Number(first(params.page));
  return {
    q: first(params.q)?.trim().slice(0, 100) || undefined,
    category: getCategory(category ?? "") ? (category as CategorySlug) : undefined,
    area: AREAS.includes(area as ShopArea) ? (area as ShopArea) : undefined,
    minPrice: toPrice(first(params.min)),
    maxPrice: toPrice(first(params.max)),
    inStockOnly: first(params.instock) === "1",
    sort: SORTS.includes(sort as SortOption) ? (sort as SortOption) : "relevance",
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}
