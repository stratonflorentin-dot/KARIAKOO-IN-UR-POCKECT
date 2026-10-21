import { ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";
import type { Metadata } from "next";
import Link from "@/components/i18n/Link";
import { Suspense } from "react";
import { ProductGrid } from "@/components/product/ProductCard";
import { ShopCard } from "@/components/shop/ShopCard";
import { buttonClasses } from "@/components/ui/Button";
import { compactInputClass } from "@/components/ui/Field";
import { EmptyState, Skeleton } from "@/components/ui/States";
import { shopAreaLabel } from "@/lib/areas";
import { getCategories, parseProductFilters, type ProductFilters } from "@/lib/catalog";
import { getCatalog } from "@/lib/catalog-source";
import { departments, productTypes } from "@/lib/departments";
import { fmt } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { getDictionary } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).search.title };
}

const sortKey = {
  relevance: "relevance",
  popular: "popular",
  newest: "newest",
  "price-asc": "priceAsc",
  "price-desc": "priceDesc",
} as const;

// With Cache Components, searchParams are read inside <Suspense> so the rest
// of the page is served instantly as a static shell.
export default async function SearchPage({ searchParams }: PageProps<"/[lang]/customer/search">) {
  const t = await getDictionary();
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t.search.title}</h1>
      <Suspense fallback={<Skeleton className="mt-6 h-96" />}>
        <SearchResults searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

function hrefWith(filters: ProductFilters, patch: Partial<ProductFilters>) {
  const f = { ...filters, ...patch };
  const params = new URLSearchParams();
  if (f.q) params.set("q", f.q);
  if (f.category) params.set("category", f.category);
  if (f.area) params.set("area", f.area);
  if (f.audience) params.set("for", f.audience);
  if (f.productType) params.set("type", f.productType);
  if (f.minPrice !== undefined) params.set("min", String(f.minPrice));
  if (f.maxPrice !== undefined) params.set("max", String(f.maxPrice));
  if (f.inStockOnly) params.set("instock", "1");
  if (f.sort && f.sort !== "relevance") params.set("sort", f.sort);
  if (f.page && f.page > 1) params.set("page", String(f.page));
  const qs = params.toString();
  return `/customer/search${qs ? `?${qs}` : ""}`;
}

async function SearchResults({ searchParams }: Pick<PageProps<"/[lang]/customer/search">, "searchParams">) {
  const t = await getDictionary();
  const s = t.search;
  const filters = parseProductFilters(await searchParams);
  const catalog = await getCatalog();
  const result = catalog.searchProducts(filters);
  const shops = filters.q ? catalog.searchShops(filters.q) : [];
  const categories = getCategories();
  const hasFilters = Boolean(filters.category || filters.area || filters.audience || filters.productType || filters.minPrice !== undefined || filters.maxPrice !== undefined || filters.inStockOnly);

  return (
    <div className="mt-5 grid gap-6 lg:grid-cols-[16rem_1fr]">
      {/* Filters: a GET form, so every filter state is a shareable URL. */}
      <form action="/customer/search" className="h-fit rounded-2xl border border-line bg-white p-4 lg:sticky lg:top-32">
        <h2 className="flex items-center gap-2 font-semibold">
          <SlidersHorizontal size={16} aria-hidden="true" /> {s.filters}
        </h2>
        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor="f-q" className="text-sm font-medium">{s.keywords}</label>
            <input id="f-q" name="q" type="search" defaultValue={filters.q} className={`${compactInputClass} mt-1`} placeholder={s.keywordsPlaceholder} />
          </div>
          <div>
            <label htmlFor="f-category" className="text-sm font-medium">{s.category}</label>
            <select id="f-category" name="category" defaultValue={filters.category ?? ""} className={`${compactInputClass} mt-1`}>
              <option value="">{t.catalog.allCategories}</option>
              {categories.map((c) => <option key={c.slug} value={c.slug}>{t.categories[c.slug as keyof Dictionary["categories"]] ?? c.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="f-for" className="text-sm font-medium">{s.forLabel}</label>
              <select id="f-for" name="for" defaultValue={filters.audience ?? ""} className={`${compactInputClass} mt-1`}>
                <option value="">{s.everyone}</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="f-type" className="text-sm font-medium">{s.typeLabel}</label>
              <select id="f-type" name="type" defaultValue={filters.productType ?? ""} className={`${compactInputClass} mt-1`}>
                <option value="">{s.any}</option>
                {productTypes.map((pt) => <option key={pt.id} value={pt.id}>{pt.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="f-area" className="text-sm font-medium">{s.shopLocation}</label>
            <select id="f-area" name="area" defaultValue={filters.area ?? ""} className={`${compactInputClass} mt-1`}>
              <option value="">{s.anywhere}</option>
              {Object.entries(shopAreaLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <fieldset>
            <legend className="text-sm font-medium">{s.priceLabel}</legend>
            <div className="mt-1 grid grid-cols-2 gap-2">
              <label className="sr-only" htmlFor="f-min">{s.minPrice}</label>
              <input id="f-min" name="min" inputMode="numeric" placeholder={s.min} defaultValue={filters.minPrice} className={compactInputClass} />
              <label className="sr-only" htmlFor="f-max">{s.maxPrice}</label>
              <input id="f-max" name="max" inputMode="numeric" placeholder={s.max} defaultValue={filters.maxPrice} className={compactInputClass} />
            </div>
          </fieldset>
          <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" name="instock" value="1" defaultChecked={filters.inStockOnly} className="h-5 w-5 accent-brand-600" />
            {s.inStockOnly}
          </label>
          <div>
            <label htmlFor="f-sort" className="text-sm font-medium">{s.sortBy}</label>
            <select id="f-sort" name="sort" defaultValue={filters.sort} className={`${compactInputClass} mt-1`}>
              {Object.entries(sortKey).map(([value, key]) => <option key={value} value={value}>{s.sort[key]}</option>)}
            </select>
          </div>
          <button type="submit" className={buttonClasses({ full: true })}>{s.apply}</button>
          {(hasFilters || filters.q) && (
            <Link href="/customer/search" className="block text-center text-sm font-medium text-brand-700 hover:underline">{s.clearAll}</Link>
          )}
        </div>
      </form>

      <div className="min-w-0">
        <p className="text-sm text-muted" role="status">
          {result.total === 1 ? t.catalog.product : fmt(t.catalog.products, { count: result.total })}
          {filters.q && <> {fmt(s.forQuery, { q: filters.q })}</>}
          {shops.length > 0 && <> · {shops.length === 1 ? s.shopFound : fmt(s.shopsFound, { count: shops.length })}</>}
          {" · "}{s.sort[sortKey[filters.sort ?? "relevance"]]}
        </p>

        {shops.length > 0 && (
          <section aria-labelledby="shop-results" className="mt-4">
            <h2 id="shop-results" className="mb-3 text-lg font-semibold">{s.shops}</h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {shops.map((s) => <li key={s.id}><ShopCard shop={s} /></li>)}
            </ul>
          </section>
        )}

        {result.total > 0 ? (
          <section aria-labelledby="product-results" className="mt-6">
            <h2 id="product-results" className="sr-only">{s.products}</h2>
            <ProductGrid products={result.items} />
            {result.pageCount > 1 && (
              <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-2">
                {result.page > 1 ? (
                  <Link href={hrefWith(filters, { page: result.page - 1 })} className={buttonClasses({ variant: "outline" })}>
                    <ChevronLeft size={16} aria-hidden="true" /> {s.previous}
                  </Link>
                ) : null}
                <span className="px-3 text-sm text-muted">{fmt(s.pageOf, { page: result.page, pages: result.pageCount })}</span>
                {result.page < result.pageCount ? (
                  <Link href={hrefWith(filters, { page: result.page + 1 })} className={buttonClasses({ variant: "outline" })}>
                    {s.next} <ChevronRight size={16} aria-hidden="true" />
                  </Link>
                ) : null}
              </nav>
            )}
          </section>
        ) : (
          <div className="mt-6">
            <EmptyState
              title={filters.q ? fmt(s.noMatchQuery, { q: filters.q }) : s.noMatch}
              body={s.noMatchBody}
              action={<Link href="/customer/search" className={buttonClasses({ variant: "outline" })}>{s.clearFilters}</Link>}
            />
          </div>
        )}
      </div>
    </div>
  );
}
