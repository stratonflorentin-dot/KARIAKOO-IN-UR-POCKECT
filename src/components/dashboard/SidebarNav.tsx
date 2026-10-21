"use client";

import {
  Banknote,
  Bell,
  Bike,
  Boxes,
  ChartColumn,
  ClipboardList,
  Gauge,
  LifeBuoy,
  Lock,
  Menu,
  Megaphone,
  Package,
  Percent,
  Scale,
  Search,
  Settings,
  Store,
  Truck,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "@/components/i18n/Link";
import { usePathname } from "next/navigation";
import { stripLocale } from "@/i18n/config";
import { useState } from "react";

// Icons are referenced by name because Server Components can't pass
// component functions to Client Components as props.
const icons = {
  overview: Gauge,
  orders: ClipboardList,
  products: Package,
  advertising: Megaphone,
  inventory: Boxes,
  finances: Banknote,
  shop: Store,
  notifications: Bell,
  support: LifeBuoy,
  riders: Bike,
  customers: Users,
  commission: Percent,
  payments: Wallet,
  delivery: Truck,
  disputes: Scale,
  analytics: ChartColumn,
  settings: Settings,
  security: Lock,
} satisfies Record<string, LucideIcon>;

export type NavIcon = keyof typeof icons;

export interface NavItem {
  label: string;
  icon: NavIcon;
  /** Omit for features scheduled in a later phase (shown, but not a link). */
  href?: string;
  phase?: number;
  exact?: boolean;
}

export function SidebarNav({ items, tone, searchable = false }: { items: NavItem[]; tone: "light" | "dark"; searchable?: boolean }) {
  const pathname = stripLocale(usePathname());
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const dark = tone === "dark";
  const visible = items.filter((i) => i.href && i.label.toLowerCase().includes(query.trim().toLowerCase()));

  const list = (
    <>
      {searchable && (
        <div className="px-3 pb-3">
          <label htmlFor="nav-search" className="sr-only">Search navigation</label>
          <div className={`flex items-center gap-2 rounded-xl px-3 ${dark ? "bg-white/10" : "bg-subtle"}`}>
            <Search size={16} className={dark ? "text-white/60" : "text-muted"} aria-hidden="true" />
            <input
              id="nav-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Jump to…"
              className={`h-10 min-w-0 flex-1 bg-transparent text-sm outline-none ${dark ? "text-white placeholder:text-white/50" : "placeholder:text-muted"}`}
            />
          </div>
        </div>
      )}
      <ul className="space-y-0.5 px-3">
        {visible.map((item) => {
          const Icon = icons[item.icon];
          const active = item.href ? (item.exact ? pathname === item.href : pathname.startsWith(item.href)) : false;
          const base = "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium";
          const toneClasses = dark
            ? (active ? "bg-white text-brand-900 shadow-sm" : "text-white/80 hover:bg-white/10 hover:text-white")
            : (active ? "bg-brand-50 text-brand-900 ring-1 ring-brand-100" : "text-ink hover:bg-subtle");
          if (!item.href) return null;
          return (
            <li key={item.label}>
              <Link
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={`${base} ${toneClasses}`}
              >
                <Icon size={18} aria-hidden="true" />
                {item.label}
              </Link>
            </li>
          );
        })}
        {visible.length === 0 && <li className={`px-3 py-2 text-sm ${dark ? "text-white/60" : "text-muted"}`}>No matches</li>}
      </ul>
    </>
  );

  return (
    <nav aria-label="Dashboard">
      {/* Compact mobile menu */}
      <div className="px-3 pb-3 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="dashboard-menu"
          className={`flex h-11 w-full items-center justify-between rounded-xl px-3 text-sm font-semibold ${dark ? "bg-white/10 text-white" : "bg-subtle text-ink"}`}
        >
          {items.find((i) => i.href && (i.exact ? pathname === i.href : pathname.startsWith(i.href)))?.label ?? "Menu"}
          {open ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
        </button>
        {open && <div id="dashboard-menu" className="pt-3">{list}</div>}
      </div>
      <div className="hidden lg:block">{list}</div>
    </nav>
  );
}
