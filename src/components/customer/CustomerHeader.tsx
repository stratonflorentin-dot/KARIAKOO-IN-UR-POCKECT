import { ClipboardList, LayoutGrid, Store, User } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { SearchBar } from "@/components/ui/SearchBar";
import { CartLink } from "./CartLink";
import { LocationSelector } from "./LocationSelector";

const navLink = "hidden h-11 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-ink hover:bg-subtle md:inline-flex";

export function CustomerHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Logo />
        <div className="hidden min-w-0 flex-1 md:block">
          <SearchBar id="header-search" />
        </div>
        <nav aria-label="Main" className="ml-auto flex items-center gap-0.5 md:ml-0">
          <Link href="/customer/categories" className={navLink}>
            <LayoutGrid size={18} aria-hidden="true" /> <span className="hidden lg:inline">Categories</span>
            <span className="sr-only lg:hidden">Categories</span>
          </Link>
          <Link href="/customer/shops" className={navLink}>
            <Store size={18} aria-hidden="true" /> <span className="hidden lg:inline">Shops</span>
            <span className="sr-only lg:hidden">Shops</span>
          </Link>
          <Link href="/customer/orders" className={navLink}>
            <ClipboardList size={18} aria-hidden="true" /> <span className="hidden lg:inline">Orders</span>
            <span className="sr-only lg:hidden">Orders</span>
          </Link>
          <Link href="/customer/profile" className={navLink}>
            <User size={18} aria-hidden="true" /> <span className="hidden lg:inline">Account</span>
            <span className="sr-only lg:hidden">Account</span>
          </Link>
          <CartLink />
        </nav>
      </div>
      <div className="border-t border-line bg-subtle">
        <div className="mx-auto flex h-10 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <LocationSelector />
          <Link href="/seller" className="hidden shrink-0 text-xs font-medium text-muted hover:text-brand-700 sm:inline">
            Sell on KARIAKOO
          </Link>
        </div>
      </div>
    </header>
  );
}
