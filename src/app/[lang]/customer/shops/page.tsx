import type { Metadata } from "next";
import Link from "@/components/i18n/Link";
import { Suspense } from "react";
import { MapLoader } from "@/components/map/MapLoader";
import { ShopCard } from "@/components/shop/ShopCard";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { EmptyState, Skeleton } from "@/components/ui/States";
import { getCatalog } from "@/lib/catalog-source";
import { shopKind, shopKindLabel } from "@/lib/shop-kind";
import type { CategorySlug } from "@/lib/types";

export const metadata: Metadata = { title: "All shops" };

export default function ShopsDirectoryPage({ searchParams }: PageProps<"/[lang]/customer/shops">) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">All shops</h1>
      <p className="mt-1 text-muted">Every kind of Kariakoo business: fashion, electronics, pharmacies, food and more.</p>
      <Suspense fallback={<Skeleton className="mt-6 h-96" />}>
        <Directory searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Directory({ searchParams }: Pick<PageProps<"/[lang]/customer/shops">, "searchParams">) {
  const raw = (await searchParams).type;
  const type = typeof raw === "string" && raw in shopKindLabel ? (raw as CategorySlug) : undefined;
  const all = (await getCatalog()).getShops();
  // Only show types that at least one approved shop has.
  const kinds = [...new Set(all.map(shopKind))];
  const shops = type ? all.filter((s) => shopKind(s) === type) : all;

  const tab = (active: boolean) =>
    `inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition ${
      active ? "border-ink bg-ink text-white" : "border-line bg-white text-ink hover:border-brand-300"
    }`;

  return (
    <>
      <nav aria-label="Shop types" className="-mx-4 mt-5 sm:mx-0">
        <ul className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-1 sm:flex-wrap sm:px-0">
          <li><Link href="/customer/shops" className={tab(!type)} aria-current={!type ? "page" : undefined}>All ({all.length})</Link></li>
          {kinds.map((k) => (
            <li key={k}>
              <Link href={`/customer/shops?type=${k}`} className={tab(type === k)} aria-current={type === k ? "page" : undefined}>
                <CategoryIcon slug={k} size={15} /> {shopKindLabel[k]}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {shops.some((s) => s.geo) && (
        <section aria-labelledby="shops-map-heading" className="mt-6">
          <h2 id="shops-map-heading" className="mb-2 text-lg font-semibold">Find shops on the map</h2>
          <MapLoader
            ariaLabel="Map of KARIAKOO shops"
            heightClass="h-72 sm:h-96"
            locate
            note="Tap a pin to open the shop. Shop coordinates may be approximate."
            points={shops.flatMap((s) => (s.geo ? [{ id: s.id, kind: "shop" as const, badge: s.name.charAt(0), label: `${s.name} · ${s.address}`, geo: s.geo, href: `/customer/shops/${s.slug}`, linkLabel: "Visit shop" }] : []))}
          />
        </section>
      )}
      <div className="mt-6">
        {shops.length > 0 ? (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {shops.map((s) => <li key={s.id}><ShopCard shop={s} /></li>)}
          </ul>
        ) : (
          <EmptyState title="No shops of this type yet" body="New sellers join every week." />
        )}
      </div>
    </>
  );
}
