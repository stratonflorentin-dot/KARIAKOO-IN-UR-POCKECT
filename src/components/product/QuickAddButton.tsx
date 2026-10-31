"use client";

import { Check, Plus } from "lucide-react";
import { useState } from "react";
import { fmt } from "@/i18n/config";
import { useI18n } from "@/i18n/client";
import { useCart } from "@/lib/cart-store";

export function QuickAddButton({ productId, productName, maxQuantity, wide = false }: {
  productId: string;
  productName: string;
  maxQuantity: number;
  wide?: boolean;
}) {
  const { add, hydrated } = useCart();
  const { t } = useI18n();
  const [added, setAdded] = useState(false);
  const label = fmt(added ? t.home.addedToCart : t.home.addToCart, { name: productName });

  return (
    <>
      <button
        type="button"
        disabled={!hydrated || maxQuantity <= 0}
        aria-label={label}
        onClick={() => {
          add(productId, 1, maxQuantity);
          setAdded(true);
        }}
        className={`relative z-10 inline-flex items-center justify-center gap-2 rounded-full font-semibold transition ${wide ? "min-h-11 px-4 text-sm" : "absolute right-2 top-2 h-10 w-10 shadow-md"} ${added ? "bg-brand-800 text-white" : "bg-brand-600 text-white hover:bg-brand-700"} disabled:cursor-not-allowed disabled:bg-stone-300`}
      >
        {added ? <Check size={wide ? 16 : 18} aria-hidden="true" /> : <Plus size={wide ? 16 : 18} aria-hidden="true" />}
        {wide && label}
      </button>
      <span className="sr-only" role="status" aria-live="polite">{added ? label : ""}</span>
    </>
  );
}
