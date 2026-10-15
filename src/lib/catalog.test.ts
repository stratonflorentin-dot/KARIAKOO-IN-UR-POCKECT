import { describe, expect, it } from "vitest";
import { demoCatalog, parseProductFilters } from "./catalog";

const { getProduct, getProducts, getShop, searchProducts, searchShops } = demoCatalog;

describe("public catalog visibility", () => {
  it("hides products from shops that are not approved", () => {
    expect(getShop("shop-008")).toBeUndefined(); // pending shop
    expect(getProduct("prd-019")).toBeUndefined();
  });

  it("hides archived products", () => {
    expect(getProduct("prd-026")).toBeUndefined();
  });
});

describe("searchProducts", () => {
  it("matches name, shop and Kiswahili category words", () => {
    expect(searchProducts({ q: "tecno spark" }).items.map((p) => p.id)).toEqual(["prd-001"]);
    // "tecno" also matches the phone case (its description mentions Tecno), but the phone ranks first.
    expect(searchProducts({ q: "tecno" }).items.map((p) => p.id)).toEqual(["prd-001", "prd-021"]);
    expect(searchProducts({ q: "msimbazi" }).total).toBeGreaterThan(1);
    expect(searchProducts({ q: "viatu" }).items.every((p) => p.category === "shoes")).toBe(true);
  });

  it("is case and accent insensitive and needs every word", () => {
    // The dress (name match) ranks above the fabric whose description mentions dresses.
    expect(searchProducts({ q: "KITENGE dress" }).items.map((p) => p.id)).toEqual(["prd-007", "prd-005"]);
  });

  it("returns nothing for an unmatched query", () => {
    expect(searchProducts({ q: "zzqqxx" })).toMatchObject({ total: 0, items: [] });
  });

  it("filters by category, price, area and availability", () => {
    const r = searchProducts({ category: "electronics", minPrice: 50_000, maxPrice: 200_000, inStockOnly: true });
    expect(r.items.map((p) => p.id).sort()).toEqual(["prd-002", "prd-003"]);
    expect(searchProducts({ area: "sinza" }).items.every((p) => p.shopId === "shop-007")).toBe(true);
    expect(searchProducts({ inStockOnly: true }).items.some((p) => p.stock === 0)).toBe(false);
  });

  it("sorts by price, popularity and newest", () => {
    const asc = searchProducts({ sort: "price-asc", pageSize: 48 }).items.map((p) => p.priceTzs);
    expect(asc).toEqual([...asc].sort((a, b) => a - b));
    const popular = searchProducts({ sort: "popular", pageSize: 48 }).items.map((p) => p.soldCount);
    expect(popular).toEqual([...popular].sort((a, b) => b - a));
    expect(searchProducts({ sort: "newest" }).items[0].id).toBe("prd-013");
  });

  it("paginates and clamps out-of-range pages", () => {
    const all = getProducts().length;
    const p1 = searchProducts({ pageSize: 10, page: 1 });
    expect(p1.items).toHaveLength(10);
    expect(p1.pageCount).toBe(Math.ceil(all / 10));
    expect(searchProducts({ pageSize: 10, page: 999 }).page).toBe(p1.pageCount);
  });
});

describe("searchShops", () => {
  it("finds shops by name or category", () => {
    expect(searchShops("footwear").map((s) => s.id)).toEqual(["shop-003"]);
    expect(searchShops("groceries").map((s) => s.id)).toEqual(["shop-005"]);
  });
});

describe("parseProductFilters", () => {
  it("parses valid params and drops invalid ones", () => {
    expect(
      parseProductFilters({ q: "  rice ", category: "groceries", min: "1,000", max: "abc", sort: "hack", page: "-2", instock: "1", area: "moon" }),
    ).toEqual({ q: "rice", category: "groceries", area: undefined, minPrice: 1000, maxPrice: undefined, inStockOnly: true, sort: "relevance", page: 1 });
  });
});
