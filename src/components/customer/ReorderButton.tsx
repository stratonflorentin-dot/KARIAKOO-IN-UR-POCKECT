"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCw, Check } from "lucide-react";
import { useCart } from "@/lib/cart-store";
import { useI18n } from "@/i18n/client";
import { localizePath } from "@/i18n/config";
import type { OrderItem } from "@/lib/types";

interface ReorderButtonProps {
  items: OrderItem[];
  className?: string;
}

export function ReorderButton({ items, className = "" }: ReorderButtonProps) {
  const router = useRouter();
  const { locale } = useI18n();
  const { add } = useCart();
  const [reordered, setReordered] = useState(false);

  function handleReorder() {
    for (const item of items) {
      if (item.productId && item.quantity > 0) {
        add(item.productId, item.quantity);
      }
    }
    setReordered(true);
    setTimeout(() => {
      router.push(localizePath(locale, "/customer/cart"));
    }, 400);
  }

  return (
    <button
      type="button"
      onClick={handleReorder}
      disabled={reordered || items.length === 0}
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-full border border-brand-600 bg-white px-5 text-sm font-semibold text-brand-700 shadow-sm transition hover:bg-brand-50 hover:text-brand-800 disabled:opacity-50 ${className}`}
    >
      {reordered ? (
        <>
          <Check size={16} className="text-emerald-600" aria-hidden="true" />
          <span>Added to cart!</span>
        </>
      ) : (
        <>
          <RotateCw size={15} aria-hidden="true" />
          <span>Reorder items</span>
        </>
      )}
    </button>
  );
}
