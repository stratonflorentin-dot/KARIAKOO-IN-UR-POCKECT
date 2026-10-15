import type { Metadata } from "next";
import { CartView } from "@/components/cart/CartView";
import { getCartCatalog } from "@/lib/cart-catalog";

export const metadata: Metadata = { title: "Cart" };

export default function CartPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Your cart</h1>
      <CartView catalog={getCartCatalog()} />
    </div>
  );
}
