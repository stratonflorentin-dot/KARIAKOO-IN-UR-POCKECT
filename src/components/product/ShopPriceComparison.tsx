"use client";

import Link from "@/components/i18n/Link";
import { BadgeCheck, MapPin, Scale, Star, Tag } from "lucide-react";
import { formatTzs } from "@/lib/format";
import type { Product, Shop } from "@/lib/types";

interface AlternativeSeller {
  product: Product;
  shop: Shop | undefined;
}

interface ShopPriceComparisonProps {
  currentProduct: Product;
  alternatives: AlternativeSeller[];
}

export function ShopPriceComparison({ currentProduct, alternatives }: ShopPriceComparisonProps) {
  if (alternatives.length === 0) return null;

  const lowestPrice = Math.min(...alternatives.map((a) => a.product.priceTzs));
  const hasCheaper = lowestPrice < currentProduct.priceTzs;

  return (
    <section aria-labelledby="price-comparison-heading" className="mt-8 rounded-3xl border border-line bg-subtle p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand-100 text-brand-800">
            <Scale size={20} aria-hidden="true" />
          </span>
          <div>
            <h2 id="price-comparison-heading" className="text-base font-bold text-ink sm:text-lg">
              Linganisha Bei Madukani (Kariakoo Price Match)
            </h2>
            <p className="text-xs text-muted">
              Maduka {alternatives.length} mengine yanayouza bidhaa hii au inayofanana:
            </p>
          </div>
        </div>

        {hasCheaper && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-900">
            <Tag size={13} className="text-emerald-700" />
            Bei nafuu zaidi inapatikana kuanzia {formatTzs(lowestPrice)}
          </span>
        )}
      </div>

      <div className="mt-4 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
        {alternatives.map(({ product, shop }, index) => {
          const diff = currentProduct.priceTzs - product.priceTzs;
          const isCheapest = product.priceTzs === lowestPrice && diff > 0;
          return (
            <div
              key={product.id}
              className="flex flex-col gap-3 p-4 transition hover:bg-stone-50/70 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-start gap-3 min-w-0">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-stone-100 text-xs font-bold text-muted">
                  #{index + 1}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="font-semibold text-ink text-sm sm:text-base">
                      {shop?.name ?? product.shopName}
                    </p>
                    {shop?.verified && (
                      <BadgeCheck size={15} className="text-brand-600" aria-label="Verified Shop" />
                    )}
                    {isCheapest && (
                      <span className="rounded-md bg-emerald-600 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white">
                        Bei Nafuu Zaidi
                      </span>
                    )}
                  </div>

                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted truncate">
                    <MapPin size={12} className="shrink-0 text-muted" />
                    <span>{shop?.address ?? "Kariakoo, Dar es Salaam"}</span>
                    {shop && shop.rating > 0 && (
                      <>
                        <span>•</span>
                        <span className="inline-flex items-center gap-0.5 font-medium text-amber-700">
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
                  <p className="text-base font-bold tabular-nums text-ink sm:text-lg">
                    {formatTzs(product.priceTzs)}
                  </p>
                  {diff > 0 ? (
                    <p className="text-xs font-semibold text-emerald-700">
                      Okoa {formatTzs(diff)}
                    </p>
                  ) : diff < 0 ? (
                    <p className="text-xs text-muted">
                      +{formatTzs(Math.abs(diff))}
                    </p>
                  ) : (
                    <p className="text-xs text-muted">Bei sawa</p>
                  )}
                </div>

                <Link
                  href={`/customer/product/${product.slug}`}
                  className={`inline-flex h-9 items-center justify-center rounded-full px-4 text-xs font-bold transition shadow-sm ${
                    isCheapest
                      ? "bg-brand-600 text-white hover:bg-brand-700"
                      : "border border-line bg-white text-ink hover:border-brand-400 hover:bg-brand-50"
                  }`}
                >
                  Tazama Duka Hili
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
