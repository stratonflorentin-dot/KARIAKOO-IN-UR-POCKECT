"use client";

// Browser cart store backed by localStorage. It stores only product ids and
// quantities: prices are looked up from the catalog for display, and the
// server recalculates everything at checkout.
import { useCallback, useSyncExternalStore } from "react";
import { addToCart, cartCount, sanitiseCart, setLineQuantity } from "@/lib/cart-logic";
import type { CartLine } from "@/lib/types";
import { createLocalStore } from "@/lib/local-store";

const store = createLocalStore<CartLine[]>("kariakoo-cart-v1", [], sanitiseCart);
const noopSubscribe = () => () => {};

export function useCart() {
  const lines = useSyncExternalStore(store.subscribe, store.get, store.getServer);
  // False during server render and hydration, true afterwards, so we never
  // flash "your cart is empty" before localStorage has been read.
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);

  const setQuantity = useCallback(
    (productId: string, quantity: number, max?: number) => store.set(setLineQuantity(store.get(), productId, quantity, max)),
    [],
  );
  const add = useCallback(
    (productId: string, quantity = 1, max?: number) => store.set(addToCart(store.get(), productId, quantity, max)),
    [],
  );
  const remove = useCallback((productId: string) => store.set(setLineQuantity(store.get(), productId, 0)), []);
  const clear = useCallback(() => store.set([]), []);

  return { lines, count: cartCount(lines), hydrated, add, setQuantity, remove, clear };
}
