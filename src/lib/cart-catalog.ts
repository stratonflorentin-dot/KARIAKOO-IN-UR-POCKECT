import type { CartProductInfo } from "@/components/cart/types";
import { getProducts, getShopName } from "@/lib/catalog";

/** Slim, public view of the catalog for the browser cart. */
export function getCartCatalog(): CartProductInfo[] {
  return getProducts().map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    shopId: p.shopId,
    shopName: getShopName(p.shopId),
    category: p.category,
    priceTzs: p.priceTzs,
    maxQuantity: Math.min(p.stock, 20),
  }));
}
