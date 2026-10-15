"use client";

// Mobile tab bar for customers: rounded and floating, with a cart badge
// (after the reference design). Hidden from the md breakpoint up.
import { ClipboardList, House, Search, ShoppingCart, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/lib/cart-store";

const tabs = [
  { href: "/customer", label: "Home", Icon: House },
  { href: "/customer/search", label: "Search", Icon: Search },
  { href: "/customer/cart", label: "Cart", Icon: ShoppingCart },
  { href: "/customer/orders", label: "Orders", Icon: ClipboardList },
  { href: "/customer/profile", label: "Account", Icon: User },
] as const;

export function CustomerBottomNav() {
  const pathname = usePathname();
  const { count, hydrated } = useCart();

  return (
    <nav
      aria-label="Customer"
      className="fixed inset-x-3 bottom-3 z-40 rounded-3xl border border-white/10 bg-night/95 px-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-1 shadow-2xl shadow-black/30 backdrop-blur md:hidden"
    >
      <ul className="grid grid-cols-5">
        {tabs.map(({ href, label, Icon }) => {
          const active = href === "/customer" ? pathname === href : pathname.startsWith(href);
          const badge = href === "/customer/cart" && hydrated && count > 0 ? count : null;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`relative flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-medium ${
                  active ? "text-brand-400" : "text-white/70 hover:text-white"
                }`}
              >
                <Icon size={21} aria-hidden="true" />
                {label}
                {badge !== null && (
                  <span className="absolute right-[18%] top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">
                    {badge}
                    <span className="sr-only"> items</span>
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
