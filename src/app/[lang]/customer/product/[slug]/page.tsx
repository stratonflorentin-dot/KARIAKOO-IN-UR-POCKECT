import { BadgeCheck, Bike, KeyRound, MapPin, ShieldCheck, Star, Store } from "lucide-react";
import Link from "@/components/i18n/Link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AddToCart } from "@/components/cart/AddToCart";
import { ShareAction } from "@/components/ui/ShareAction";
import { RecordView } from "@/components/customer/RecentlyViewed";
import { Price } from "@/components/product/Price";
import { ShopKindBadge } from "@/components/shop/ShopMark";
import { ProductCard } from "@/components/product/ProductCard";
import { ProductImage } from "@/components/product/ProductImage";
import { ShopPriceComparison } from "@/components/product/ShopPriceComparison";
import { StockBadge } from "@/components/product/StockBadge";
import { Skeleton } from "@/components/ui/States";
import { fmt } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { getDictionary } from "@/i18n/server";
import { getCategory } from "@/lib/catalog";
import { audienceLabel, productTypeLabel } from "@/lib/departments";
import { getCatalog } from "@/lib/catalog-source";
import { deliveryZones, EXTRA_PICKUP_FEE_TZS } from "@/lib/delivery";
import { formatTzs } from "@/lib/format";

// No generateStaticParams: products come from live Supabase data (which can be
// empty), so these pages render on demand rather than being prebuilt.
export async function generateMetadata({ params }: PageProps<"/[lang]/customer/product/[slug]">) {
  const { slug } = await params;
  const product = (await getCatalog()).getProduct(slug);
  return product ? { title: product.name, description: product.description } : { title: "Product not found" };
}

export default function ProductPage({ params }: PageProps<"/[lang]/customer/product/[slug]">) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
      <Suspense fallback={<Skeleton className="h-[32rem]" />}>
        <ProductContent params={params} />
      </Suspense>
    </div>
  );
}

async function ProductContent({ params }: Pick<PageProps<"/[lang]/customer/product/[slug]">, "params">) {
  const { slug } = await params;
  const catalog = await getCatalog();
  const product = catalog.getProduct(slug);
  if (!product) notFound();
  const t = await getDictionary();
  const d = t.product;
  const shop = catalog.getShop(product.shopId);
  const category = getCategory(product.category);
  const categoryName = category ? (t.categories[category.slug as keyof Dictionary["categories"]] ?? category.name) : "";
  const related = catalog.searchProducts({ category: product.category, sort: "popular", pageSize: 5 }).items.filter((p) => p.id !== product.id).slice(0, 4);
  const alternatives = catalog.findAlternativeSellers(product);
  const cheapest = Math.min(...deliveryZones.map((z) => z.feeTzs));

  return (
    <>
      <RecordView productId={product.id} />
      <nav aria-label="Breadcrumb" className="truncate text-sm text-muted">
        <Link href="/customer" className="hover:text-ink">{t.nav.home}</Link> /{" "}
        {category && <><Link href={`/customer/category/${category.slug}`} className="hover:text-ink">{categoryName}</Link> /{" "}</>}
        <span aria-current="page" className="text-ink">{product.name}</span>
      </nav>

      <div className="mt-4 grid gap-8 lg:grid-cols-2 lg:gap-12">
        <div className="overflow-hidden rounded-3xl border border-line">
          <ProductImage category={product.category} name={product.name} imageUrl={product.imageUrl} size="lg" />
        </div>

        <div>
          <div className="flex items-start justify-between gap-3">
            {shop ? (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <Link href={`/customer/shops/${shop.slug}`} className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline">
                  <Store size={15} aria-hidden="true" /> {shop.name}
                  {shop.verified && <><BadgeCheck size={15} aria-hidden="true" /><span className="sr-only">(verified seller)</span></>}
                </Link>
                {shop.verified && <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-800">{d.verifiedSeller}</span>}
                <ShopKindBadge shop={shop} />
                {shop.reviewCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-muted">
                    <Star size={13} className="fill-gold-400 text-gold-400" aria-hidden="true" />
                    {shop.rating.toFixed(1)} <span className="text-muted/80">({shop.reviewCount})</span>
                  </span>
                )}
              </div>
            ) : <span />}
            <ShareAction
              title={product.name}
              text={`Angalia bidhaa hii kwenye Kariakoo: ${product.name}`}
              variant="button"
            />
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-4xl">{product.name}</h1>
          {product.audience && (
            <p className="mt-2 flex flex-wrap gap-2 text-sm">
              <Link href={product.audience === "unisex" ? "/customer/department/men" : `/customer/department/${product.audience}`} className="rounded-full bg-night px-3 py-1 font-medium text-white hover:bg-stone-800">
                {product.audience === "unisex" ? d.menWomen : audienceLabel(product.audience)}
              </Link>
              {product.productType && (
                <Link href={`/customer/search?type=${product.productType}${product.audience !== "unisex" ? `&for=${product.audience}` : ""}`} className="rounded-full border border-line px-3 py-1 font-medium hover:border-brand-300">
                  {productTypeLabel(product.productType)}
                </Link>
              )}
            </p>
          )}
          <div className="mt-4">
            <Price amount={product.priceTzs} compareAt={product.compareAtTzs} size="lg" />
            <p className="mt-1 text-sm text-muted">{fmt(d.perDelivery, { unit: product.unit, fee: formatTzs(cheapest) })}</p>
          </div>
          <div className="mt-3"><StockBadge stock={product.stock} /></div>

          {product.wholesalePriceTzs && product.wholesaleMinQty && product.wholesalePriceTzs < product.priceTzs && (
            <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50/80 p-3.5 text-xs text-amber-950 sm:text-sm">
              <div className="flex items-center gap-2 font-semibold">
                <span className="rounded-md bg-amber-600 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white">
                  Bei ya Jumla
                </span>
                <span>Vipande {product.wholesaleMinQty}+ kwa {formatTzs(product.wholesalePriceTzs)} / kipande</span>
              </div>
              <p className="mt-1 text-xs text-amber-800">
                Nunua kwa wingi kwa ajili ya biashara au duka lako. Bei ya jumla itatumika moja kwa moja kwenye kikapu ukifikisha vipande {product.wholesaleMinQty}.
              </p>
            </div>
          )}

          <div className="mt-6">
            <AddToCart productId={product.id} productName={product.name} maxQuantity={Math.min(product.stock, 20)} />
          </div>

          {/* Compact reassurance at the decision point — honest claims only. */}
          <ul className="mt-4 grid grid-cols-3 gap-2 text-center">
            {[
              { Icon: Bike, label: d.trustDoorstep },
              { Icon: ShieldCheck, label: d.trustSecure },
              { Icon: KeyRound, label: d.trustPin },
            ].map(({ Icon, label }) => (
              <li key={label} className="flex flex-col items-center gap-1 rounded-2xl border border-line bg-subtle px-2 py-3">
                <Icon size={18} className="text-brand-600" aria-hidden="true" />
                <span className="text-xs font-medium text-ink">{label}</span>
              </li>
            ))}
          </ul>

          <ul className="mt-6 space-y-3 rounded-2xl bg-subtle p-4 text-sm">
            <li className="flex gap-3">
              <ShieldCheck className="shrink-0 text-brand-600" size={20} aria-hidden="true" />
              <span><strong className="font-semibold">{d.payTitle}</strong> {d.payBody}</span>
            </li>
            <li className="flex gap-3">
              <Bike className="shrink-0 text-brand-600" size={20} aria-hidden="true" />
              <span>{fmt(d.riderDelivery, { min: formatTzs(cheapest), max: formatTzs(Math.max(...deliveryZones.map((z) => z.feeTzs))), extra: formatTzs(EXTRA_PICKUP_FEE_TZS) })}</span>
            </li>
            {shop && (
              <li className="flex gap-3">
                <MapPin className="shrink-0 text-brand-600" size={20} aria-hidden="true" />
                <span>{fmt(d.shipsFrom, { address: shop.address, hours: shop.openingHours })}</span>
              </li>
            )}
          </ul>

          <section aria-labelledby="details-heading" className="mt-8">
            <h2 id="details-heading" className="text-lg font-semibold">{d.details}</h2>
            <p className="mt-2 leading-7 text-muted">{product.description}</p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {product.highlights.map((h) => <li key={h} className="rounded-full border border-line px-3 py-1 text-sm">{h}</li>)}
            </ul>
          </section>
        </div>
      </div>

      {/* Multi-Shop Price Comparison (Linganisha Bei Madukani) */}
      <ShopPriceComparison currentProduct={product} alternatives={alternatives} />

      {related.length > 0 && (
        <section aria-labelledby="related-heading" className="mt-14">
          <h2 id="related-heading" className="mb-4 text-xl font-bold tracking-tight">{fmt(d.moreIn, { category: categoryName })}</h2>
          <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
            {related.map((p) => <li key={p.id}><ProductCard product={p} /></li>)}
          </ul>
        </section>
      )}
    </>
  );
}
