import type { CategorySlug } from "@/lib/types";

// Public product info the cart UI needs for display. Prices here are for
// display only; checkout totals are always recalculated on the server.
export interface CartProductInfo {
  id: string;
  slug: string;
  name: string;
  shopId: string;
  shopName: string;
  category: CategorySlug;
  priceTzs: number;
  maxQuantity: number;
}
