"use client";

import { ShoppingCart } from "lucide-react";
import Link from "@/components/i18n/Link";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n/config";
import { useCart } from "@/lib/cart-store";

export function CartLink() {
  const { count, hydrated } = useCart();
  const { t } = useI18n();
  const shown = hydrated ? count : 0;
  return (
    <Link
      href="/customer/cart"
      className="relative inline-flex h-11 items-center gap-2 rounded-full px-3 text-sm font-semibold text-ink hover:bg-subtle"
      aria-label={`${t.nav.cart}, ${shown === 1 ? t.common.item : fmt(t.common.items, { count: shown })}`}
    >
      <ShoppingCart size={20} aria-hidden="true" />
      <span className="hidden lg:inline">{t.nav.cart}</span>
      {shown > 0 && (
        <span aria-hidden="true" className="absolute right-0 top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-brand-600 px-1 text-[11px] font-bold text-white lg:static">
          {shown}
        </span>
      )}
    </Link>
  );
}
