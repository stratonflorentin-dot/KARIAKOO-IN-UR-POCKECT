"use client";

import { ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/lib/cart-store";
import { QuantityStepper } from "./QuantityStepper";

export function AddToCart({ productId, productName, maxQuantity }: {
  productId: string;
  productName: string;
  /** Display cap only; the server enforces the real stock limit at checkout. */
  maxQuantity: number;
}) {
  const { lines, add, hydrated } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [status, setStatus] = useState("");

  const inCart = lines.find((l) => l.productId === productId)?.quantity ?? 0;
  const remaining = Math.max(0, maxQuantity - inCart);

  if (maxQuantity <= 0) {
    return (
      <button type="button" disabled className="h-12 w-full cursor-not-allowed rounded-full bg-stone-200 font-semibold text-stone-600">
        Out of stock
      </button>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <QuantityStepper
          value={Math.min(quantity, Math.max(1, remaining))}
          min={1}
          max={Math.max(1, remaining)}
          onChange={setQuantity}
          label={`Quantity of ${productName}`}
        />
        <button
          type="button"
          disabled={!hydrated || remaining === 0}
          onClick={() => {
            const qty = Math.min(quantity, remaining);
            add(productId, qty, maxQuantity);
            setStatus(`Added ${qty} to your cart.`);
            setQuantity(1);
          }}
          className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-brand-600 px-6 font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-600"
        >
          <ShoppingCart size={18} aria-hidden="true" />
          {remaining === 0 ? "Maximum in cart" : "Add to cart"}
        </button>
      </div>
      <p role="status" aria-live="polite" className="min-h-5 text-sm text-muted">
        {status}
        {inCart > 0 && (
          <>
            {status ? " " : ""}
            {inCart} in cart ·{" "}
            <Link href="/customer/cart" className="font-semibold text-brand-700 underline-offset-2 hover:underline">View cart</Link>
          </>
        )}
      </p>
    </div>
  );
}
