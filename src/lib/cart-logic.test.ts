import { describe, expect, it } from "vitest";
import { addToCart, cartCount, MAX_CART_QUANTITY, sanitiseCart, setLineQuantity } from "./cart-logic";

describe("cart logic", () => {
  it("adds items and merges repeated adds", () => {
    let cart = addToCart([], "prd-001");
    cart = addToCart(cart, "prd-001", 2);
    cart = addToCart(cart, "prd-005");
    expect(cart).toEqual([
      { productId: "prd-001", quantity: 3 },
      { productId: "prd-005", quantity: 1 },
    ]);
    expect(cartCount(cart)).toBe(4);
  });

  it("updates quantities with stock and global caps", () => {
    const cart = [{ productId: "prd-003", quantity: 1 }];
    expect(setLineQuantity(cart, "prd-003", 10, 3)).toEqual([{ productId: "prd-003", quantity: 3 }]);
    expect(setLineQuantity(cart, "prd-003", 500)[0].quantity).toBe(MAX_CART_QUANTITY);
  });

  it("removes items at quantity zero", () => {
    expect(setLineQuantity([{ productId: "a", quantity: 2 }], "a", 0)).toEqual([]);
  });

  it("sanitises tampered storage", () => {
    expect(
      sanitiseCart([
        { productId: "a", quantity: 2, priceTzs: 1 },
        { productId: "a", quantity: 5 },
        { productId: "b", quantity: -1 },
        { productId: 7, quantity: 1 },
        { productId: "c", quantity: 999 },
        null,
      ]),
    ).toEqual([
      { productId: "a", quantity: 2 },
      { productId: "c", quantity: MAX_CART_QUANTITY },
    ]);
    expect(sanitiseCart("garbage")).toEqual([]);
  });
});
