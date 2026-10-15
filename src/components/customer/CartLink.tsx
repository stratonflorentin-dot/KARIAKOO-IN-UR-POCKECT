"use client";

import { ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useCart } from "@/lib/cart-store";

export function CartLink() {
  const { count, hydrated } = useCart();
  const shown = hydrated ? count : 0;
  return (
    <Link
      href="/customer/cart"
      className="relative inline-flex h-11 items-center gap-2 rounded-full px-3 text-sm font-semibold text-ink hover:bg-subtle"
      aria-label={`Cart, ${shown} ${shown === 1 ? "item" : "items"}`}
    >
      <ShoppingCart size={20} aria-hidden="true" />
      <span className="hidden lg:inline">Cart</span>
      {shown > 0 && (
        <span aria-hidden="true" className="absolute right-0 top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-brand-600 px-1 text-[11px] font-bold text-white lg:static">
          {shown}
        </span>
      )}
    </Link>
  );
}
