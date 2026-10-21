"use client";

// Mobile tab bar for customers: rounded and floating, with a cart badge
// (after the reference design). Hidden from the md breakpoint up.
import { ClipboardList, House, Search, ShoppingCart, User } from "lucide-react";
import Link from "@/components/i18n/Link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/i18n/client";
import { stripLocale } from "@/i18n/config";
import { useCart } from "@/lib/cart-store";

const tabs = [
  { href: "/customer", key: "home", Icon: House },
  { href: "/customer/search", key: "search", Icon: Search },
  { href: "/customer/cart", key: "cart", Icon: ShoppingCart },
  { href: "/customer/orders", key: "orders", Icon: ClipboardList },
  { href: "/customer/profile", key: "account", Icon: User },
] as const;

export function CustomerBottomNav() {
  const pathname = stripLocale(usePathname());
  const { count, hydrated } = useCart();
  const { t } = useI18n();

  return (
    <nav
      aria-label={t.nav.customerNav}
      className="fixed inset-x-3 bottom-3 z-40 rounded-3xl border border-white/10 bg-night/95 px-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-1 shadow-2xl shadow-black/30 backdrop-blur md:hidden"
    >
      <ul className="grid grid-cols-5">
        {tabs.map(({ href, key, Icon }) => {
          const active = href === "/customer" ? pathname === href : pathname.startsWith(href);
          const badge = href === "/customer/cart" && hydrated && count > 0 ? count : null;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`relative flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-semibold transition-colors ${
                  active ? "bg-white/10 text-brand-300" : "text-white/65 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon size={21} aria-hidden="true" />
                {t.nav[key]}
                {badge !== null && (
                  <span className="absolute right-[18%] top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">
                    {badge}
                    <span className="sr-only"> {t.nav.cartItems}</span>
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
