import { BadgeCheck, MapPin, Star } from "lucide-react";
import Link from "next/link";
import type { Shop } from "@/lib/types";
import { ShopKindBadge, ShopMark } from "./ShopMark";

export function ShopCard({ shop }: { shop: Shop }) {
  return (
    <article className="relative flex h-full flex-col rounded-2xl border border-line bg-white p-4 transition hover:border-brand-300 hover:shadow-md focus-within:ring-2 focus-within:ring-brand-500">
      <div className="flex items-start gap-3">
        <ShopMark shop={shop} />
        <div className="min-w-0">
          <h3 className="flex items-center gap-1 font-semibold text-ink">
            <Link href={`/customer/shops/${shop.slug}`} className="truncate outline-none after:absolute after:inset-0">
              {shop.name}
            </Link>
            {shop.verified && (
              <>
                <BadgeCheck className="shrink-0 text-brand-600" size={18} aria-hidden="true" />
                <span className="sr-only">(verified)</span>
              </>
            )}
          </h3>
          <div className="mt-1"><ShopKindBadge shop={shop} /></div>
        </div>
      </div>
      <p className="mt-3 flex items-center gap-1 truncate text-xs text-muted">
        <MapPin size={12} aria-hidden="true" /> {shop.address}
      </p>
      <p className="mt-1 line-clamp-2 text-sm text-muted">{shop.description}</p>
      <p className="mt-auto flex items-center gap-1 pt-3 text-sm font-medium text-ink">
        <Star className="fill-brand-500 text-brand-500" size={15} aria-hidden="true" />
        {shop.rating.toFixed(1)}
        <span className="font-normal text-muted">({shop.reviewCount} reviews) · {shop.openingHours}</span>
      </p>
    </article>
  );
}
