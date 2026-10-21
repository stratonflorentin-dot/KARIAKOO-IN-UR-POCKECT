"use client";

import { Badge } from "@/components/ui/Badge";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n/config";
import { stockLevel } from "@/lib/product-utils";

export function StockBadge({ stock }: { stock: number }) {
  const { t } = useI18n();
  const level = stockLevel(stock);
  if (level === "out") return <Badge tone="neutral">{t.product.outOfStock}</Badge>;
  if (level === "low") return <Badge tone="warning">{fmt(t.product.onlyLeft, { count: stock })}</Badge>;
  return <Badge tone="success">{t.product.inStock}</Badge>;
}

/** The "Offer" ribbon on a product card. */
export function OfferBadge() {
  const { t } = useI18n();
  return <span className="absolute right-2 top-2 rounded-full bg-brand-600 px-2 py-0.5 text-[11px] font-bold text-white">{t.product.offer}</span>;
}
