import { demoProducts } from "@/data/demo/products";
import { shopGeo } from "@/data/demo/geo";
import { demoShops } from "@/data/demo/shops";
import { categories } from "@/data/categories";
import { createCatalog } from "@/lib/catalog";

/** Catalog fixture for isolated unit tests. Never imported by app pages. */
export const demoCatalog = createCatalog({
  categories,
  shops: demoShops.map((shop) => ({ ...shop, geo: shopGeo[shop.id] })),
  products: demoProducts,
});
