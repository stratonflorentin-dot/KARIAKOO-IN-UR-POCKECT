// The public catalog. createCatalog builds a read-only view over live
// Supabase rows; fixtures belong in tests, never in user-facing reads.
import { categories } from "@/data/categories";
import { inDepartment, isAudience, isProductType } from "@/lib/departments";
import type { Audience, Category, CategorySlug, Product, ProductType, Shop, ShopArea } from "@/lib/types";

export { isOnOffer, stockLevel, type StockLevel } from "@/lib/product-utils";

export interface CatalogData {
  categories: Category[];
  shops: Shop[];
  products: Product[];
}

/** Categories are fixed reference data (the database is seeded from this list). */
export function getCategories(): Category[] {
  return categories;
}

export function getCategory(slug: string): Category | undefined {
  return categories.find((c) => c.slug === slug);
}

export type SortOption = "relevance" | "price-asc" | "price-desc" | "popular" | "newest";

export interface ProductFilters {
  q?: string;
  category?: CategorySlug;
  area?: ShopArea;
  /** Department: men / women / kids (unisex items count for men and women). */
  audience?: Audience;
  productType?: ProductType;
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

export function createCatalog(data: CatalogData) {
  // Only approved shops, and only their active products, are public.
  const shops = data.shops.filter((s) => s.status === "approved");
  const shopById = new Map(data.shops.map((s) => [s.id, s]));
  const publicShopIds = new Set(shops.map((s) => s.id));
  const products = data.products
    .filter((p) => p.status === "active" && publicShopIds.has(p.shopId))
    .map((p) => ({ ...p, shopName: p.shopName ?? shopById.get(p.shopId)?.name ?? "Unknown shop" }));

  const getShop = (slugOrId: string) => shops.find((s) => s.slug === slugOrId || s.id === slugOrId);
  const getProduct = (slugOrId: string) => products.find((p) => p.slug === slugOrId || p.id === slugOrId);
  const getShopName = (shopId: string) => shopById.get(shopId)?.name ?? "Unknown shop";
  const getShopArea = (shopId: string) => shopById.get(shopId)?.area;

  const haystack = (p: Product) => {
    const c = getCategory(p.category);
    return normalise([p.name, p.description, getShopName(p.shopId), c?.name, c?.nameSw].join(" "));
  };

  /** Product search with filters, sorting and pagination. */
  function searchProducts(filters: ProductFilters): ProductSearchResult {
    const terms = termsOf(filters.q);
    const pageSize = Math.min(Math.max(filters.pageSize ?? 12, 1), 48);

    let items = products.filter((p) => {
      if (filters.category && p.category !== filters.category) return false;
      if (filters.shopId && p.shopId !== filters.shopId) return false;
      if (filters.area && getShopArea(p.shopId) !== filters.area) return false;
      if (filters.audience && !inDepartment(p.audience, filters.audience)) return false;
      if (filters.productType && p.productType !== filters.productType) return false;
      if (filters.minPrice !== undefined && p.priceTzs < filters.minPrice) return false;
      if (filters.maxPrice !== undefined && p.priceTzs > filters.maxPrice) return false;
      if (filters.inStockOnly && p.stock <= 0) return false;
      if (terms.length > 0) {
        const text = haystack(p);
        if (!terms.every((t) => text.includes(t))) return false;
      }
      return true;
    });

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
    items = [...items].sort(sorters[filters.sort ?? "relevance"]);

    const total = items.length;
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(Math.max(Math.floor(filters.page ?? 1), 1), pageCount);
    return { items: items.slice((page - 1) * pageSize, page * pageSize), total, page, pageCount };
  }

  function searchShops(query: string): Shop[] {
    const terms = termsOf(query);
    if (terms.length === 0) return [];
    return shops.filter((s) => {
      const text = normalise([s.name, s.address, s.description, ...s.categories.map((c) => getCategory(c)?.name)].join(" "));
      return terms.every((t) => text.includes(t));
    });
  }

  return {
    getCategories,
    getCategory,
    getShops: () => shops,
    getShop,
    getProducts: () => products,
    getProduct,
    getProductsByCategory: (slug: string) => products.filter((p) => p.category === slug),
    getProductsByShop: (shopId: string) => products.filter((p) => p.shopId === shopId),
    getShopName,
    getShopArea,
    searchProducts,
    searchShops,
  };
}

export type Catalog = ReturnType<typeof createCatalog>;

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
  const audience = first(params.for);
  const type = first(params.type);
  return {
    q: first(params.q)?.trim().slice(0, 100) || undefined,
    category: getCategory(category ?? "") ? (category as CategorySlug) : undefined,
    area: AREAS.includes(area as ShopArea) ? (area as ShopArea) : undefined,
    audience: isAudience(audience) && audience !== "unisex" ? audience : undefined,
    productType: isProductType(type) ? type : undefined,
    minPrice: toPrice(first(params.min)),
    maxPrice: toPrice(first(params.max)),
    inStockOnly: first(params.instock) === "1",
    sort: SORTS.includes(sort as SortOption) ? (sort as SortOption) : "relevance",
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}
