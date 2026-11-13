import { BadgeCheck, MapPin, Package } from "lucide-react";
import { formatTzs } from "@/lib/format";
import { getDictionary } from "@/i18n/server";
import { requireRole } from "@/lib/auth/session";
import { getCategory } from "@/lib/catalog";
import { shopAreaLabel } from "@/lib/areas";
import { liveSellerProducts, liveSellerShop } from "@/lib/data/seller-live";
import { ProductImage } from "@/components/product/ProductImage";
import { EmptyState } from "@/components/ui/States";
import { PageHeader } from "@/components/ui/Card";
import type { ShopArea } from "@/lib/types";

export default async function SellerStorefrontPreviewPage() {
  const t = await getDictionary();
  const labels = t.seller;
  const session = await requireRole("seller");
  const shop = await liveSellerShop(session);
  if (!shop) return <EmptyState title={labels.setUpFirst} body={labels.noShopDesc} />;

  const products = (await liveSellerProducts(session, shop.id)).filter((product) => product.status === "active");
  const category = getCategory(shop.primaryCategory);

  return (
    <>
      <PageHeader title={labels.storefrontPreviewTitle} description={labels.storefrontPreviewDescription} />

      <section className="relative isolate mt-4 overflow-hidden rounded-3xl bg-night text-white">
        {shop.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- Public Supabase Storage image.
          <img src={shop.imageUrl} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-105 object-cover opacity-35 blur-[2px]" />
        )}
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-night/90 via-night/80 to-emerald-950/75" />
        <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(40rem_20rem_at_90%_0%,rgba(16,185,129,0.35),transparent_60%)]" />
        <div className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:gap-5 sm:p-8">
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-white/25 bg-white/10 shadow-lg sm:h-24 sm:w-24">
            {shop.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- Public Supabase Storage image.
              <img src={shop.imageUrl} alt={`${shop.name} shop`} className="h-full w-full object-cover" />
            ) : (
              <span className="grid h-full w-full place-items-center text-3xl font-bold text-brand-200" aria-label={`${shop.name} shop`}>{shop.name.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="min-w-0">
            {category && <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-900">{t.categories[category.slug]}</span>}
            <h1 className="mt-2 flex flex-wrap items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
              {shop.name}
              {shop.status === "approved" && <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1 text-xs font-medium text-emerald-100"><BadgeCheck size={14} aria-hidden="true" /> {t.product.verifiedSeller}</span>}
            </h1>
            <p className="mt-2 flex items-center gap-1 text-sm text-white/80"><MapPin size={14} aria-hidden="true" /> {shop.address} · {shopAreaLabel[shop.area as ShopArea] ?? shop.area}</p>
          </div>
        </div>
      </section>

      {shop.description && <p className="mt-5 max-w-3xl whitespace-pre-line text-sm leading-relaxed text-muted">{shop.description}</p>}

      <section className="mt-7" aria-labelledby="seller-preview-products">
        <h2 id="seller-preview-products" className="mb-4 text-lg font-bold tracking-tight">{labels.previewProducts}</h2>
        {products.length === 0 ? (
          <EmptyState title={labels.previewNoProducts} body={labels.previewNoProductsBody} />
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => (
              <li key={product.id}>
                <article className="flex h-full flex-col overflow-hidden rounded-3xl border border-stone-200/80 bg-white shadow-sm">
                  <ProductImage category={product.category} name={product.name} imageUrl={product.imageUrl} />
                  <div className="flex flex-1 flex-col gap-2 p-3.5 sm:p-4">
                    <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-ink">{product.name}</h3>
                    <p className="text-sm font-bold text-brand-800">{formatTzs(product.priceTzs)}</p>
                    <p className="mt-auto flex items-center gap-1 text-xs text-muted"><Package size={13} aria-hidden="true" /> {product.stock} {labels.previewInStock}</p>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
