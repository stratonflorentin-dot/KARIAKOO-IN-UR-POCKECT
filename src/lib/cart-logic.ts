// Pure cart operations (no browser APIs), shared by the cart store and tests.
import type { CartLine } from "@/lib/types";

export const MAX_CART_QUANTITY = 20;
export const MAX_CART_LINES = 30;

/** Turns untrusted stored data into a clean cart. */
export function sanitiseCart(value: unknown): CartLine[] {
  if (!Array.isArray(value)) return [];
  const lines: CartLine[] = [];
  for (const item of value) {
    const productId = typeof item?.productId === "string" ? item.productId.slice(0, 64) : null;
    const quantity = Number(item?.quantity);
    if (!productId || !Number.isInteger(quantity) || quantity < 1) continue;
    if (lines.some((l) => l.productId === productId)) continue;
    lines.push({ productId, quantity: Math.min(quantity, MAX_CART_QUANTITY) });
    if (lines.length >= MAX_CART_LINES) break;
  }
  return lines;
}

/** Sets a line's quantity (0 removes it), capped at `max` and the global cap. */
export function setLineQuantity(lines: CartLine[], productId: string, quantity: number, max = MAX_CART_QUANTITY): CartLine[] {
  const capped = Math.max(0, Math.min(Math.floor(quantity), max, MAX_CART_QUANTITY));
  if (capped === 0) return lines.filter((l) => l.productId !== productId);
  if (lines.some((l) => l.productId === productId)) {
    return lines.map((l) => (l.productId === productId ? { ...l, quantity: capped } : l));
  }
  if (lines.length >= MAX_CART_LINES) return lines;
  return [...lines, { productId, quantity: capped }];
}

export function addToCart(lines: CartLine[], productId: string, quantity = 1, max = MAX_CART_QUANTITY): CartLine[] {
  const existing = lines.find((l) => l.productId === productId)?.quantity ?? 0;
  return setLineQuantity(lines, productId, existing + quantity, max);
}

export function cartCount(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.quantity, 0);
}
