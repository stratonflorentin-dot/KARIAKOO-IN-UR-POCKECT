"use client";

// App-style navigation for the seller area: a fixed bottom tab bar on phones and
// a pill tab row on desktop. Distinct from the admin/rider sidebar frame.
import { Banknote, ClipboardList, Gauge, Megaphone, Package, type LucideIcon } from "lucide-react";
import Link from "@/components/i18n/Link";
import { usePathname } from "next/navigation";
import { stripLocale } from "@/i18n/config";

const tabIcons: Record<string, LucideIcon> = {
  overview: Gauge,
  orders: ClipboardList,
  products: Package,
  advertising: Megaphone,
  finances: Banknote,
};

export interface SellerTab {
  label: string;
  icon: string;
  href: string;
  exact?: boolean;
}

export function SellerTabBar({ items }: { items: SellerTab[] }) {
  const pathname = stripLocale(usePathname());
  const isActive = (i: SellerTab) => (i.exact ? pathname === i.href : pathname.startsWith(i.href));

  return (
    <>
      {/* Desktop: pill tabs under the app bar */}
      <div className="hidden border-b border-stone-200 bg-white lg:block">
        <ul className="mx-auto flex max-w-5xl gap-1 px-4 py-2">
          {items.map((i) => {
            const Icon = tabIcons[i.icon] ?? Gauge;
            const active = isActive(i);
            return (
              <li key={i.href}>
                <Link
                  href={i.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${active ? "bg-brand-600 text-white shadow-sm" : "text-stone-600 hover:bg-subtle"}`}
                >
                  <Icon size={16} aria-hidden="true" /> {i.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Phone: fixed bottom tab bar */}
      <nav
        aria-label="Seller navigation"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 shadow-[0_-2px_14px_rgba(0,0,0,0.07)] backdrop-blur-md lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="mx-auto flex max-w-lg items-stretch">
          {items.map((i) => {
            const Icon = tabIcons[i.icon] ?? Gauge;
            const active = isActive(i);
            return (
              <li key={i.href} className="flex-1">
                <Link
                  href={i.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-[10px] font-bold ${active ? "text-brand-700" : "text-stone-500"}`}
                >
                  <span className={`grid h-8 w-14 place-items-center rounded-full transition ${active ? "bg-brand-100 text-brand-700" : ""}`}>
                    <Icon size={20} strokeWidth={active ? 2.4 : 2} aria-hidden="true" />
                  </span>
                  <span className="truncate">{i.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
