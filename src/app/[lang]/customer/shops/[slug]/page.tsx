import { BadgeCheck, Clock, MapPin, Star } from "lucide-react";
import Link from "@/components/i18n/Link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { MapLoader } from "@/components/map/MapLoader";
import { ProductGrid } from "@/components/product/ProductCard";
import { directionsUrl } from "@/lib/maps";
import { ShopKindBadge, ShopMark } from "@/components/shop/ShopMark";
import { buttonClasses } from "@/components/ui/Button";
import { compactInputClass } from "@/components/ui/Field";
import { EmptyState, Skeleton } from "@/components/ui/States";
import { shopAreaLabel } from "@/lib/areas";
import { getCategory, parseProductFilters } from "@/lib/catalog";
import { getCatalog } from "@/lib/catalog-source";

// No generateStaticParams: shops come from live Supabase data (which can be
// empty), so these pages render on demand rather than being prebuilt.
export async function generateMetadata({ params }: PageProps<"/[lang]/customer/shops/[slug]">) {
  const { slug } = await params;
  return { title: (await getCatalog()).getShop(slug)?.name ?? "Shop" };
}

export default function ShopPage({ params, searchParams }: PageProps<"/[lang]/customer/shops/[slug]">) {
  return (
    <Suspense fallback={<Skeleton className="mx-auto h-96 max-w-7xl" />}>
      <ShopContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function ShopContent({ params, searchParams }: PageProps<"/[lang]/customer/shops/[slug]">) {
  const { slug } = await params;
  const catalog = await getCatalog();
  const shop = catalog.getShop(slug);
  if (!shop) notFound();
  const filters = parseProductFilters(await searchParams);
  const { items } = catalog.searchProducts({ q: filters.q, category: filters.category, shopId: shop.id, sort: "popular", pageSize: 48 });

  return (
    <>
      <section className="relative overflow-hidden bg-night text-white">
        <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(40rem_20rem_at_90%_0%,rgba(16,185,129,0.4),transparent_60%)]" />
        <div className="relative mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:px-6 sm:py-12">
          <ShopMark shop={shop} size="lg" />
          <div className="min-w-0">
            <ShopKindBadge shop={shop} />
            <h1 className="mt-2 flex flex-wrap items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
              {shop.name}
              {shop.verified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium text-brand-200">
                  <BadgeCheck size={14} aria-hidden="true" /> Verified
                </span>
              )}
            </h1>
            <p className="mt-1 flex items-center gap-1 text-white/75"><MapPin size={14} aria-hidden="true" /> {shop.address} · {shopAreaLabel[shop.area]}</p>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/75">
              <span className="inline-flex items-center gap-1"><Star size={14} className="fill-brand-400 text-brand-400" aria-hidden="true" /> {shop.rating.toFixed(1)} ({shop.reviewCount} reviews)</span>
              <span className="inline-flex items-center gap-1"><Clock size={14} aria-hidden="true" /> {shop.openingHours}</span>
              <span>Since {shop.joinedYear}</span>
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <p className="max-w-2xl text-muted">{shop.description}</p>
        <p className="mt-2 text-sm text-muted">
          Orders from this shop are placed with and paid to KARIAKOO.{" "}
          <Link href="/customer#how" className="font-medium text-brand-700 hover:underline">How it works</Link>
        </p>

        <form action={`/customer/shops/${shop.slug}`} className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label htmlFor="shop-q" className="text-sm font-medium">Search this shop</label>
            <input id="shop-q" name="q" type="search" defaultValue={filters.q} className={`${compactInputClass} mt-1`} />
          </div>
          <div className="sm:w-56">
            <label htmlFor="shop-cat" className="text-sm font-medium">Category</label>
            <select id="shop-cat" name="category" defaultValue={filters.category ?? ""} className={`${compactInputClass} mt-1`}>
              <option value="">All</option>
              {shop.categories.map((c) => <option key={c} value={c}>{getCategory(c)?.name}</option>)}
            </select>
          </div>
          <button type="submit" className={buttonClasses({ variant: "dark" })}>Filter</button>
        </form>

        <h2 className="mb-4 mt-8 text-xl font-bold tracking-tight">Products ({items.length})</h2>
        {items.length > 0 ? (
          <ProductGrid products={items} />
        ) : (
          <EmptyState title="No matching products" body="Try another word or category." action={<Link className={buttonClasses({ variant: "outline" })} href={`/customer/shops/${shop.slug}`}>Show all products</Link>} />
        )}

        {shop.geo && (
          <section aria-labelledby="location-heading" className="mt-12">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h2 id="location-heading" className="text-lg font-semibold">Location</h2>
              <a href={directionsUrl(shop.geo)} target="_blank" rel="noopener noreferrer" className={buttonClasses({ variant: "outline", size: "sm" })}>
                Get directions
              </a>
            </div>
            <MapLoader
              ariaLabel={`Map showing ${shop.name}`}
              heightClass="h-64"
              points={[{ id: shop.id, kind: "shop", badge: shop.name.charAt(0), label: `${shop.name} · ${shop.address}`, geo: shop.geo }]}
              note="You can also order online: a KARIAKOO rider collects from this shop and delivers to you."
            />
          </section>
        )}

        <section aria-labelledby="reviews-heading" className="mt-12 rounded-2xl border border-line p-5">
          <h2 id="reviews-heading" className="font-semibold">Reviews</h2>
          <p className="mt-1 text-sm text-muted">
            {shop.reviewCount > 0 ? `Rated ${shop.rating.toFixed(1)} from ${shop.reviewCount} customer reviews.` : "Customer reviews have not been added yet."}
          </p>
        </section>
      </div>
    </>
  );
}
