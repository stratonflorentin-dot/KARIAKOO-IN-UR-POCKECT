import Link from "next/link";
import { SectionHeading } from "@/components/customer/SectionHeading";
import type { CustomerPromotion } from "@/lib/data/promotions";

export function ShopPromotions({ promotions }: { promotions: CustomerPromotion[] }) {
  if (promotions.length === 0) return null;
  return <section aria-labelledby="shop-stories-heading">
    <SectionHeading id="shop-stories-heading" title="From Kariakoo shops" subtitle="Updates and product teasers posted by local sellers" />
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {promotions.map((promotion) => {
        const href = promotion.productSlug
          ? `/customer/product/${promotion.productSlug}`
          : `/customer/shops/${promotion.shopSlug}`;
        return <li key={promotion.id} className="overflow-hidden rounded-2xl border border-line bg-white">
          {promotion.imageUrl && <Link href={href} className="block aspect-[16/9] overflow-hidden bg-subtle">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={promotion.imageUrl} alt={promotion.title ?? `${promotion.shopName} promotion`} loading="lazy" className="h-full w-full object-cover" />
          </Link>}
          <div className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">{promotion.shopName} · {promotion.kind === "teaser" ? "Coming soon" : promotion.kind === "branding" ? "Shop introduction" : "Shop update"}</p>
            {promotion.title && <h3 className="mt-1 font-semibold text-ink">{promotion.title}</h3>}
            {promotion.body && <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm text-muted">{promotion.body}</p>}
            <Link href={href} className="mt-3 inline-flex min-h-10 items-center text-sm font-semibold text-brand-700 hover:underline">
              {promotion.productSlug ? "View product" : "Visit shop"} <span aria-hidden="true" className="ml-1">→</span>
            </Link>
          </div>
        </li>;
      })}
    </ul>
  </section>;
}
