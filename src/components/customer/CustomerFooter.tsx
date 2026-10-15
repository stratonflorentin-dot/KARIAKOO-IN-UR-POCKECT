import Link from "next/link";
import { CatalogSourceNote } from "@/components/CatalogSourceNote";
import { Logo } from "@/components/ui/Logo";

export function CustomerFooter() {
  return (
    <footer className="mt-16 bg-night pb-28 pt-12 text-white/70 md:pb-12">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo tone="light" />
          <p className="mt-3 max-w-md text-sm leading-6">
            Kariakoo&apos;s shops, online. You pay KARIAKOO, we confirm your order with each shop, a rider delivers it,
            and the shop is paid after delivery.
          </p>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white">Shop</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link className="hover:text-white" href="/customer/categories">All categories</Link></li>
            <li><Link className="hover:text-white" href="/customer/shops">All shops</Link></li>
            <li><Link className="hover:text-white" href="/customer/search">Search</Link></li>
            <li><Link className="hover:text-white" href="/customer/orders">My orders</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white">Work with us</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link className="hover:text-white" href="/seller">Business owners</Link></li>
            <li><Link className="hover:text-white" href="/rider">Riders</Link></li>
          </ul>
        </div>
      </div>
      <div className="mx-auto mt-10 max-w-7xl space-y-1 px-4 sm:px-6">
        <p className="text-xs text-white/50">Development build. All products, shops, prices, people and orders shown are demo data.</p>
        <CatalogSourceNote />
      </div>
    </footer>
  );
}
