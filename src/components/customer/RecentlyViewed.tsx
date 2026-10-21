"use client";

import { History } from "lucide-react";
import Link from "@/components/i18n/Link";
import { useEffect } from "react";
import { formatTzs } from "@/lib/format";
import { recordRecentlyViewed, useRecentlyViewed } from "@/lib/preferences-store";

export interface RecentProductInfo {
  id: string;
  slug: string;
  name: string;
  priceTzs: number;
  shopName: string;
}

/** Shows products this device viewed recently. Renders nothing if none. */
export function RecentlyViewed({ products }: { products: RecentProductInfo[] }) {
  const ids = useRecentlyViewed();
  const byId = new Map(products.map((p) => [p.id, p]));
  const items = ids.map((id) => byId.get(id)).filter((p): p is RecentProductInfo => Boolean(p));
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="recent-heading">
      <h2 id="recent-heading" className="mb-3 flex items-center gap-2 text-lg font-bold tracking-tight">
        <History size={18} className="text-brand-600" aria-hidden="true" /> Recently viewed
      </h2>
      <ul className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {items.map((p) => (
          <li key={p.id} className="w-56 shrink-0">
            <Link href={`/customer/product/${p.slug}`} className="block rounded-2xl border border-line bg-white p-3 hover:border-brand-300">
              <span className="line-clamp-1 text-sm font-semibold">{p.name}</span>
              <span className="block text-xs text-muted">{p.shopName}</span>
              <span className="mt-1 block text-sm font-bold">{formatTzs(p.priceTzs)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Records a product view on this device. */
export function RecordView({ productId }: { productId: string }) {
  useEffect(() => {
    recordRecentlyViewed(productId);
  }, [productId]);
  return null;
}
