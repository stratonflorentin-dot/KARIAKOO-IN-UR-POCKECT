import { BadgeCheck, MapPin, Scale, Star, Tag } from "lucide-react";
import Link from "@/components/i18n/Link";
import { ProductImage } from "@/components/product/ProductImage";
import { getCatalog } from "@/lib/catalog-source";
import { formatTzs } from "@/lib/format";
import type { CategorySlug, Product, Shop } from "@/lib/types";

export const metadata = {
  title: "Linganisha Bei za Kariakoo · KARIAKOO",
  description: "Linganisha bei za mashati, viatu, nguo na vifaa vya elektroniki kutoka maduka tofauti ya Kariakoo kupata bei nafuu zaidi.",
};

interface ComparedProductGroup {
  id: string;
  title: string;
  category: CategorySlug;
  minPrice: number;
  maxPrice: number;
  featuredProduct: Product;
  sellers: {
    product: Product;
    shop: Shop | undefined;
  }[];
}

export default async function ComparePage() {
  const catalog = await getCatalog();
  const allProducts = catalog.getProducts();

  // Group products by productType or common category keywords across different shops
  const groupMap = new Map<string, Product[]>();

  for (const product of allProducts) {
    const key = product.productType
      ? `${product.category}:${product.productType}`
      : `${product.category}:${product.name.split(" ")[0].toLowerCase()}`;

    const existing = groupMap.get(key) ?? [];
    groupMap.set(key, [...existing, product]);
  }

  const comparedGroups: ComparedProductGroup[] = [];

  for (const [key, prods] of groupMap.entries()) {
    // Only group when multiple unique shops sell items in this group
    const uniqueShopIds = new Set(prods.map((p) => p.shopId));
    if (uniqueShopIds.size >= 2) {
      const sortedByPrice = [...prods].sort((a, b) => a.priceTzs - b.priceTzs);
      const minPrice = sortedByPrice[0].priceTzs;
      const maxPrice = sortedByPrice[sortedByPrice.length - 1].priceTzs;

      // Group title
      const p0 = sortedByPrice[0];
      const title = p0.productType
        ? p0.productType.replace("-", " ").replace(/\b\w/g, (l) => l.toUpperCase())
        : p0.name;

      comparedGroups.push({
        id: key,
        title,
        category: p0.category,
        minPrice,
        maxPrice,
        featuredProduct: p0,
        sellers: sortedByPrice.map((p) => ({
          product: p,
          shop: catalog.getShop(p.shopId),
        })),
      });
    }
  }

  // Fallback: If not enough natural multi-seller overlaps in sample data, include top categories
  if (comparedGroups.length === 0 && allProducts.length > 0) {
    const sorted = [...allProducts].sort((a, b) => a.priceTzs - b.priceTzs);
    comparedGroups.push({
      id: "featured-comparison",
      title: "Bidhaa Maarufu za Maduka ya Kariakoo",
      category: sorted[0].category,
      minPrice: sorted[0].priceTzs,
      maxPrice: sorted[sorted.length - 1]?.priceTzs ?? sorted[0].priceTzs,
      featuredProduct: sorted[0],
      sellers: sorted.slice(0, 5).map((p) => ({
        product: p,
        shop: catalog.getShop(p.shopId),
      })),
    });
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Hero Header */}
      <div className="rounded-3xl border border-line bg-gradient-to-br from-night via-brand-950 to-brand-900 p-6 text-white sm:p-10 shadow-sm">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1 text-xs font-semibold text-gold-300">
          <Scale size={14} />
          <span>Linganisha Bei za Kariakoo (Market Price Match)</span>
        </div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-4xl">
          Tafuta Bidhaa Moja, Linganisha Bei ya Maduka Yote
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/70 sm:text-base">
          Wafanyabiashara tofauti wa Kariakoo (Congo St, Aggrey, Msimbazi) wanauza mashati, viatu na vifaa vinavyofanana kwa bei tofauti. Linganisha hapa ili upate bei nafuu zaidi kabla ya kuagiza.
        </p>
      </div>

      {/* Comparison Grid */}
      <section aria-labelledby="groups-heading" className="mt-8 space-y-8">
        <h2 id="groups-heading" className="text-xl font-bold tracking-tight text-ink">
          Bidhaa Zenye Maduka Tofauti ({comparedGroups.length})
        </h2>

        <div className="space-y-6">
          {comparedGroups.map((group) => (
            <article
              key={group.id}
              className="overflow-hidden rounded-3xl border border-line bg-white shadow-sm"
            >
              {/* Group Overview Banner */}
              <div className="flex flex-col gap-4 border-b border-line bg-stone-50/60 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-line bg-white">
                    <ProductImage
                      category={group.category}
                      name={group.featuredProduct.name}
                      imageUrl={group.featuredProduct.imageUrl}
                    />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-semibold uppercase tracking-wider text-brand-700">
                      {group.category}
                    </span>
                    <h3 className="text-lg font-bold text-ink truncate">{group.title}</h3>
                    <p className="text-xs text-muted">
                      Inauzwa na maduka {group.sellers.length} tofauti Kariakoo
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0 sm:text-right">
                  <div>
                    <p className="text-xs text-muted">Masafa ya Bei (Price Range)</p>
                    <p className="text-lg font-bold tabular-nums text-brand-800">
                      {formatTzs(group.minPrice)} – {formatTzs(group.maxPrice)}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                    <Tag size={13} /> Okoa hadi {formatTzs(group.maxPrice - group.minPrice)}
                  </span>
                </div>
              </div>

              {/* Multi-Seller Offers List */}
              <div className="divide-y divide-line">
                {group.sellers.map(({ product, shop }, idx) => {
                  const isLowest = product.priceTzs === group.minPrice;
                  return (
                    <div
                      key={product.id}
                      className="flex flex-col gap-3 p-4 transition hover:bg-stone-50/50 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-stone-100 text-xs font-bold text-muted">
                          #{idx + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-sm text-ink">
                              {shop?.name ?? product.shopName}
                            </p>
                            {shop?.verified && (
                              <BadgeCheck size={14} className="text-brand-600" aria-label="Verified" />
                            )}
                            {isLowest && (
                              <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                                Bei Nafuu Zaidi (Best Deal)
                              </span>
                            )}
                          </div>

                          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                            <MapPin size={12} className="shrink-0" />
                            <span>{shop?.address ?? "Kariakoo, Dar es Salaam"}</span>
                            {shop && shop.rating > 0 && (
                              <>
                                <span>•</span>
                                <span className="inline-flex items-center gap-0.5 text-amber-700">
                                  <Star size={11} className="fill-amber-400 text-amber-400" />
                                  {shop.rating.toFixed(1)}
                                </span>
                              </>
                            )}
                          </p>

                          <p className="mt-1 text-xs text-stone-600 line-clamp-1">
                            {product.name}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-4 sm:justify-end shrink-0 pt-2 border-t border-line sm:border-t-0 sm:pt-0">
                        <div className="text-left sm:text-right">
                          <p className="text-base font-bold tabular-nums text-ink">
                            {formatTzs(product.priceTzs)}
                          </p>
                          <p className="text-[11px] text-muted">
                            {product.stock > 0 ? `${product.stock} vipo stoo` : "Haitoshi"}
                          </p>
                        </div>

                        <Link
                          href={`/customer/product/${product.slug}`}
                          className={`inline-flex h-9 items-center justify-center rounded-full px-4 text-xs font-bold transition shadow-sm ${
                            isLowest
                              ? "bg-brand-600 text-white hover:bg-brand-700"
                              : "border border-line bg-white text-ink hover:border-brand-400 hover:bg-brand-50"
                          }`}
                        >
                          Nunua Kutoka Hapa
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
