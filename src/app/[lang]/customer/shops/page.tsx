import type { Metadata } from "next";
import Link from "@/components/i18n/Link";
import { Suspense } from "react";
import { MapLoader } from "@/components/map/MapLoader";
import { ShopCard } from "@/components/shop/ShopCard";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { EmptyState, Skeleton } from "@/components/ui/States";
import { getDictionary } from "@/i18n/server";
import { fmt } from "@/i18n/config";
import { getCatalog } from "@/lib/catalog-source";
import { shopKind, shopKindLabel } from "@/lib/shop-kind";
import type { CategorySlug } from "@/lib/types";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).footer.allShops };
}

export default async function ShopsDirectoryPage({ searchParams }: PageProps<"/[lang]/customer/shops">) {
  const t = await getDictionary();
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t.footer.allShops}</h1>
      <p className="mt-1 text-muted">{t.shops.directorySubtitle}</p>
      <Suspense fallback={<Skeleton className="mt-6 h-96" />}>
        <Directory searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Directory({ searchParams }: Pick<PageProps<"/[lang]/customer/shops">, "searchParams">) {
  const t = await getDictionary();
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
      <nav aria-label={t.shops.shopTypes} className="-mx-4 mt-5 sm:mx-0">
        <ul className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-1 sm:flex-wrap sm:px-0">
          <li><Link href="/customer/shops" className={tab(!type)} aria-current={!type ? "page" : undefined}>{fmt(t.shops.all, { count: all.length })}</Link></li>
          {kinds.map((k) => (
            <li key={k}>
              <Link href={`/customer/shops?type=${k}`} className={tab(type === k)} aria-current={type === k ? "page" : undefined}>
                <CategoryIcon slug={k} size={15} /> {t.shopKinds[k]}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {shops.some((s) => s.geo) && (
        <section aria-labelledby="shops-map-heading" className="mt-6">
          <h2 id="shops-map-heading" className="mb-2 text-lg font-semibold">{t.shops.mapTitle}</h2>
          <MapLoader
            ariaLabel={t.shops.mapAria}
            heightClass="h-72 sm:h-96"
            locate
            note={t.shops.mapNote}
            points={shops.flatMap((s) => (s.geo ? [{ id: s.id, kind: "shop" as const, badge: s.name.charAt(0), label: `${s.name} · ${s.address}`, geo: s.geo, href: `/customer/shops/${s.slug}`, linkLabel: t.shops.visitShop }] : []))}
          />
        </section>
      )}
      <div className="mt-6">
        {shops.length > 0 ? (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {shops.map((s) => <li key={s.id}><ShopCard shop={s} /></li>)}
          </ul>
        ) : (
          <EmptyState title={t.shops.noneTitle} body={t.shops.noneBody} />
        )}
      </div>
    </>
  );
}
