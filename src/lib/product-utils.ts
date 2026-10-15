// Small product helpers with no data imports, safe to use in the browser.
import type { Product } from "@/lib/types";

export type StockLevel = "out" | "low" | "in";

export function stockLevel(stock: number): StockLevel {
  if (stock <= 0) return "out";
  if (stock <= 5) return "low";
  return "in";
}

export function isOnOffer(p: Pick<Product, "priceTzs" | "compareAtTzs">): boolean {
  return p.compareAtTzs !== undefined && p.compareAtTzs > p.priceTzs;
}

/** Only https image URLs are rendered (blocks javascript:/data: tricks). */
export function safeImageUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("blob:")) return url; // local preview in the seller form
  try {
    const u = new URL(url);
    return u.protocol === "https:" ? u.toString() : undefined;
  } catch {
    return undefined;
  }
}
