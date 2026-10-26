import { ChevronRight, LayoutGrid, MapPin, Package, Scale, ShoppingBag, Store, Truck, User } from "lucide-react";
import Link from "@/components/i18n/Link";
import { RecentlyViewed } from "@/components/customer/RecentlyViewed";
import { SectionHeading } from "@/components/customer/SectionHeading";
import { ShopPromotions } from "@/components/customer/ShopPromotions";
import { OrderStatusBadge } from "@/components/orders/StatusBadges";
import { ProductGrid } from "@/components/product/ProductCard";
import { ShopCard } from "@/components/shop/ShopCard";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { SearchBar } from "@/components/ui/SearchBar";
import { EmptyState } from "@/components/ui/States";
import { fmt } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { getDictionary } from "@/i18n/server";
import { getSession } from "@/lib/auth/session";
import { getCategories } from "@/lib/catalog";
import { getCatalog } from "@/lib/catalog-source";
import { liveCustomerOrders } from "@/lib/data/customer-live";
import { customerPromotions } from "@/lib/data/promotions";
import { formatTzs } from "@/lib/format";
import { orderTotals } from "@/lib/money";
import { isOnOffer } from "@/lib/product-utils";

// Reads live catalog, session and orders, which change, so render on demand.
export const instant = false;

/** Time-of-day greeting in Dar es Salaam (not the server's timezone). */
function darGreeting(t: Dictionary): string {
  const now = new Date();
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Dar_es_Salaam", hour: "2-digit", hour12: false }).format(now));
  if (hour < 12) return t.home.morning;
  if (hour < 17) return t.home.afternoon;
  return t.home.evening;
}

export default async function CustomerHomePage() {
  const t = await getDictionary();
  const session = await getSession();
  const customer = session?.role === "customer" ? session : null;
  const firstName = customer?.displayName?.trim().split(" ")[0] || "";
  const recentOrders = customer ? (await liveCustomerOrders(customer)).slice(0, 3) : [];

  const catalog = await getCatalog();
  const promotions = await customerPromotions();
  const categories = getCategories();
  const featured = catalog.searchProducts({ sort: "popular", inStockOnly: true, pageSize: 8 }).items;
  const newest = catalog.searchProducts({ sort: "newest", inStockOnly: true, pageSize: 8 }).items;
  const offers = catalog.getProducts().filter(isOnOffer);
  const shops = [...catalog.getShops()].sort((a, b) => b.reviewCount - a.reviewCount).slice(0, 6);
  const recentInfo = catalog.getProducts().map((p) => ({ id: p.id, slug: p.slug, name: p.name, priceTzs: p.priceTzs, shopName: catalog.getShopName(p.shopId) }));

  return (
    <div className="mx-auto max-w-7xl space-y-7 px-4 pb-10 pt-5 sm:px-6">
      {/* Greeting (reference: avatar, "Good morning, Amina", location). */}
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-600 text-base font-bold text-white" aria-hidden="true">
          {firstName ? firstName.charAt(0).toUpperCase() : <User size={20} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">{customer ? `${darGreeting(t)}${firstName ? `, ${firstName}` : ""}` : t.home.welcome}</p>
          <p className="flex items-center gap-1 text-xs text-muted"><MapPin size={12} aria-hidden="true" /> {t.common.location}</p>
        </div>
        {!customer && (
          <Link href="/sign-in" className="shrink-0 rounded-full border border-line px-4 py-2 text-sm font-semibold hover:border-brand-300">{t.common.signIn}</Link>
        )}
      </div>

      <SearchBar id="home-search" />

      {/* Promo banner. */}
      <section aria-label={t.home.bannerTitle} className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-night p-5 text-white sm:p-8">
        <span aria-hidden="true" className="absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/10" />
        <span aria-hidden="true" className="absolute -bottom-16 right-16 h-32 w-32 rounded-full bg-gold-400/20" />
        <div className="relative max-w-[62%] sm:max-w-md">
          <h1 className="text-xl font-bold leading-tight sm:text-3xl">{t.home.bannerTitle}</h1>
          <Link href="/customer/search" className="mt-4 inline-flex h-10 items-center rounded-full bg-gold-400 px-5 text-sm font-bold text-ink transition hover:bg-gold-300">
            {t.home.shopNow}
          </Link>
        </div>
        <ShoppingBag aria-hidden="true" strokeWidth={1.4} className="absolute -right-1 bottom-2 h-28 w-28 text-gold-400 sm:right-8 sm:h-40 sm:w-40" />
      </section>

      {/* Categories as round icon buttons. */}
      <nav aria-label={t.home.categoriesLabel}>
        <ul className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          <li className="shrink-0">
            <Link href="/customer/categories" className="flex w-[4.5rem] flex-col items-center gap-1.5 text-center">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-brand-600 text-white"><LayoutGrid size={22} aria-hidden="true" /></span>
              <span className="text-[11px] font-semibold leading-tight">{t.home.all}</span>
            </Link>
          </li>
          {categories.map((c) => (
            <li key={c.slug} className="shrink-0">
              <Link href={`/customer/category/${c.slug}`} className="flex w-[4.5rem] flex-col items-center gap-1.5 text-center">
                <span className="grid h-14 w-14 place-items-center rounded-full bg-brand-50 text-brand-700 transition hover:bg-brand-100"><CategoryIcon slug={c.slug} size={22} /></span>
                <span className="line-clamp-2 text-[11px] font-medium leading-tight">{t.categories[c.slug as keyof Dictionary["categories"]] ?? c.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Price Comparison Banner (Linganisha Bei) */}
      <Link
        href="/customer/compare"
        className="flex items-center gap-4 rounded-2xl border border-brand-200 bg-gradient-to-r from-brand-50 to-emerald-50/60 p-4 transition hover:border-brand-400 hover:shadow-sm sm:p-5"
      >
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-600 text-white shadow-sm">
          <Scale size={22} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-ink">Linganisha Bei za Kariakoo (Market Price Match)</p>
          <p className="mt-0.5 text-xs text-muted leading-relaxed">
            Bidhaa moja, maduka mengi, bei tofauti — angalia bei zote kwa wakati mmoja na uchague duka lenye bei nafuu zaidi.
          </p>
        </div>
        <ChevronRight size={18} className="shrink-0 text-brand-600" aria-hidden="true" />
      </Link>

      <section aria-labelledby="featured-heading">
        <SectionHeading id="featured-heading" title={t.home.featured} href="/customer/search?sort=popular" linkLabel={t.common.viewAll} />
        {featured.length > 0 ? (
          <ProductGrid products={featured} />
        ) : (
          <EmptyState title={t.home.noProducts} body={t.home.noProductsBody} />
        )}
      </section>

      {recentOrders.length > 0 && (
        <section aria-labelledby="recent-orders-heading">
          <SectionHeading id="recent-orders-heading" title={t.home.recentOrders} href="/customer/orders" linkLabel={t.common.viewAll} />
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recentOrders.map((o) => {
              const itemCount = o.items.reduce((s, i) => s + i.quantity, 0);
              return (
                <li key={o.id}>
                  <Link href={`/customer/orders/${o.id}`} className="flex items-center gap-3 rounded-2xl border border-line bg-white p-4 transition hover:border-brand-300 hover:shadow-sm">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700"><Package size={18} aria-hidden="true" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{o.reference}</span>
                        <OrderStatusBadge status={o.status} />
                      </span>
                      <span className="block text-xs text-muted">{itemCount === 1 ? t.common.item : fmt(t.common.items, { count: itemCount })} ·{formatTzs(orderTotals(o.items, o.deliveryFeeTzs).customerTotalTzs)}</span>
                    </span>
                    <ChevronRight size={18} className="shrink-0 text-muted" aria-hidden="true" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <RecentlyViewed products={recentInfo} />
      <ShopPromotions promotions={promotions} />

      {offers.length > 0 && (
        <section aria-labelledby="offers-heading" className="rounded-3xl bg-brand-50 p-4 sm:p-6">
          <SectionHeading id="offers-heading" title={t.home.offers} subtitle={t.home.offersSubtitle} />
          <ProductGrid products={offers} />
        </section>
      )}

      {newest.length > 0 && (
        <section aria-labelledby="new-heading">
          <SectionHeading id="new-heading" title={t.home.newArrivals} href="/customer/search?sort=newest" linkLabel={t.common.viewAll} />
          <ProductGrid products={newest} />
        </section>
      )}

      {shops.length > 0 && (
        <section aria-labelledby="shops-heading">
          <SectionHeading id="shops-heading" title={t.home.popularShops} href="/customer/shops" linkLabel={t.common.viewAll} />
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {shops.map((s) => <li key={s.id}><ShopCard shop={s} /></li>)}
          </ul>
        </section>
      )}

      {/* Cross-role promotional strip — links customers to partner programmes. */}
      <section aria-labelledby="partner-heading" className="rounded-3xl border border-line bg-gradient-to-br from-night to-stone-800 p-5 text-white sm:p-8">
        <h2 id="partner-heading" className="text-lg font-bold">Participate in Kariakoo</h2>
        <p className="mt-1 text-sm text-white/70">Run your own shop or earn by delivering — join our community.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Link
            href="/apply/seller"
            className="flex items-center gap-3 rounded-2xl bg-white/10 p-4 transition hover:bg-white/20"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gold-400/20 text-gold-400">
              <Store size={18} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="font-semibold">Sell with us</p>
              <p className="text-xs text-white/60">Open your Kariakoo shop</p>
            </div>
            <ChevronRight size={16} className="ml-auto shrink-0 text-white/40" aria-hidden="true" />
          </Link>
          <Link
            href="/apply/rider"
            className="flex items-center gap-3 rounded-2xl bg-white/10 p-4 transition hover:bg-white/20"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-400/20 text-brand-300">
              <Truck size={18} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="font-semibold">Deliver with us</p>
              <p className="text-xs text-white/60">Earn as a Kariakoo rider</p>
            </div>
            <ChevronRight size={16} className="ml-auto shrink-0 text-white/40" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </div>
  );
}
