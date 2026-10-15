import { Bike, ShieldCheck, Store, Wallet } from "lucide-react";
import Link from "next/link";
import { LocationSelector } from "@/components/customer/LocationSelector";
import { RecentlyViewed } from "@/components/customer/RecentlyViewed";
import { SectionHeading } from "@/components/customer/SectionHeading";
import { ProductCard, ProductGrid } from "@/components/product/ProductCard";
import { ShopCard } from "@/components/shop/ShopCard";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { SearchBar } from "@/components/ui/SearchBar";
import { getCategories, getProducts, getShopName, getShops, isOnOffer, searchProducts } from "@/lib/catalog";

export default function CustomerHomePage() {
  const categories = getCategories();
  const featured = searchProducts({ sort: "popular", inStockOnly: true, pageSize: 8 }).items;
  const newest = searchProducts({ sort: "newest", inStockOnly: true, pageSize: 4 }).items;
  const offers = getProducts().filter(isOnOffer);
  const shops = [...getShops()].sort((a, b) => b.reviewCount - a.reviewCount).slice(0, 6);
  const recentInfo = getProducts().map((p) => ({ id: p.id, slug: p.slug, name: p.name, priceTzs: p.priceTzs, shopName: getShopName(p.shopId) }));

  return (
    <>
      {/* Hero: dark, warm and premium, after the reference design. */}
      <section className="relative overflow-hidden bg-night text-white">
        <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(60rem_30rem_at_85%_-10%,rgba(249,115,22,0.5),transparent_60%),radial-gradient(40rem_25rem_at_-10%_110%,rgba(194,65,12,0.35),transparent_60%)]" />
        <div aria-hidden="true" className="absolute inset-0 opacity-[0.06] [background-image:repeating-linear-gradient(45deg,#fff_0_2px,transparent_2px_22px)]" />
        <div className="relative mx-auto max-w-7xl px-4 pb-10 pt-8 sm:px-6 sm:pt-14 lg:pb-14">
          <div className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1.5 backdrop-blur md:hidden">
            <LocationSelector tone="dark" />
          </div>
          <p className="mt-5 text-sm font-medium text-brand-200 md:mt-0">Karibu Kariakoo, online</p>
          <h1 className="mt-2 max-w-2xl text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
            Dar&apos;s biggest market, delivered to your door.
          </h1>
          <p className="mt-4 max-w-xl text-base text-white/75 sm:text-lg">
            Hundreds of Kariakoo shops in one place. Pay KARIAKOO securely, and one rider brings everything to you.
          </p>
          <div className="mt-6 max-w-2xl">
            <SearchBar variant="glass" id="hero-search" />
          </div>
          <nav aria-label="Categories" className="-mx-4 mt-6 sm:mx-0">
            <ul className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-1 sm:flex-wrap sm:px-0">
              {categories.map((c) => (
                <li key={c.slug} className="shrink-0">
                  <Link
                    href={`/customer/category/${c.slug}`}
                    className="inline-flex h-11 items-center gap-2 rounded-full border border-white/15 bg-white/10 pl-1.5 pr-4 text-sm font-medium text-white backdrop-blur-md transition hover:border-brand-400/60 hover:bg-white/15"
                  >
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-white/15">
                      <CategoryIcon slug={c.slug} size={16} />
                    </span>
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-14 px-4 pt-10 sm:px-6">
        <RecentlyViewed products={recentInfo} />

        <section aria-labelledby="featured-heading">
          <SectionHeading id="featured-heading" title="Featured in Kariakoo" subtitle="Best sellers, in stock and ready for delivery" href="/customer/search?sort=popular" linkLabel="Browse all" />
          <ul className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
            {featured.map((p) => (
              <li key={p.id} className="w-[44%] shrink-0 snap-start sm:w-56">
                <ProductCard product={p} />
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="new-heading">
          <SectionHeading id="new-heading" title="New arrivals" subtitle="Just listed by Kariakoo sellers" href="/customer/search?sort=newest" />
          <ProductGrid products={newest} />
        </section>

        {offers.length > 0 && (
          <section aria-labelledby="offers-heading" className="rounded-3xl bg-brand-50 p-4 sm:p-6">
            <SectionHeading id="offers-heading" title="Special offers" subtitle="Reduced prices from verified shops" />
            <ProductGrid products={offers} />
          </section>
        )}

        <section aria-labelledby="shops-heading">
          <SectionHeading id="shops-heading" title="Popular Kariakoo shops" subtitle="Fashion, electronics, pharmacies, food and more" href="/customer/shops" linkLabel="All shops" />
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {shops.map((s) => (
              <li key={s.id}><ShopCard shop={s} /></li>
            ))}
          </ul>
        </section>

        <section id="how" aria-labelledby="how-heading" className="rounded-3xl bg-night px-5 py-8 text-white sm:px-10 sm:py-12">
          <h2 id="how-heading" className="text-2xl font-bold tracking-tight">How KARIAKOO works</h2>
          <p className="mt-2 max-w-2xl text-white/70">One trusted company between you and the shop, from order to delivery.</p>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { Icon: Store, title: "Order from many shops", body: "Fill one cart with items from different Kariakoo shops." },
              { Icon: Wallet, title: "Pay KARIAKOO", body: "You pay us, not the shop. Mobile money is coming soon." },
              { Icon: Bike, title: "One rider delivers", body: "We confirm stock with each shop, collect, and deliver in one trip." },
              { Icon: ShieldCheck, title: "Shop paid after delivery", body: "Sellers are paid once you confirm delivery with your PIN." },
            ].map(({ Icon, title, body }, i) => (
              <li key={title} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-600"><Icon size={20} aria-hidden="true" /></span>
                <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-brand-200">Step {i + 1}</p>
                <h3 className="mt-1 font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-white/70">{body}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </>
  );
}
