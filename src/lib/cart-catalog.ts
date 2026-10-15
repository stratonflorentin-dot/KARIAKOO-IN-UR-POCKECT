import type { CartProductInfo } from "@/components/cart/types";
import type { Catalog } from "@/lib/catalog";

/** Slim, public view of the catalog for the browser cart. */
export function getCartCatalog(catalog: Catalog): CartProductInfo[] {
  return catalog.getProducts().map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    shopId: p.shopId,
    shopName: catalog.getShopName(p.shopId),
    category: p.category,
    priceTzs: p.priceTzs,
    maxQuantity: Math.min(p.stock, 20),
  }));
}
