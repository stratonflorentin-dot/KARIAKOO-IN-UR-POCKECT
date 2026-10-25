import { AlertTriangle, BadgeCheck, ClipboardList, Eye, Megaphone, Package, Plus, Receipt, Timer } from "lucide-react";
import Link from "@/components/i18n/Link";
import { ShareAction } from "@/components/ui/ShareAction";
import { Card, CardHeader, PageHeader, StatCard } from "@/components/ui/Card";
import { SellerShopLocation } from "@/components/dashboard/SellerShopLocation";
import { fmt } from "@/i18n/config";
import { getDictionary } from "@/i18n/server";
import { requireRole } from "@/lib/auth/session";
import { liveSellerProducts, liveSellerShop, liveSellerSummary } from "@/lib/data/seller-live";

export default async function SellerDashboardPage() {
  const t = await getDictionary();
  const s = t.seller;
  const session = await requireRole("seller");
  const shop = await liveSellerShop(session);
  if (!shop) {
    return (
      <>
        <PageHeader title={s.noShopTitle} description={s.noShopDesc} />
        <Link className="text-sm font-medium text-brand-700 hover:underline" href="/apply/seller">{s.setUpShop}</Link>
      </>
    );
  }
  const [summary, products] = await Promise.all([liveSellerSummary(session, shop.id), liveSellerProducts(session, shop.id)]);
  const verified = shop.status === "approved";

  const actions = [
    { href: "/seller/products", Icon: Package, title: s.myProducts, sub: fmt(s.listedCount, { count: summary.productCount }) },
    { href: "/seller/products", Icon: Plus, title: s.addProduct, sub: s.createListing },
    { href: "/seller/orders", Icon: ClipboardList, title: s.ordersAction, sub: summary.pendingOrders ? fmt(s.needAction, { count: summary.pendingOrders }) : s.manageOrders },
    { href: "/seller/advertising", Icon: Megaphone, title: s.advertise, sub: s.promoteShop },
    { href: "/seller/finances", Icon: Receipt, title: s.finances, sub: s.proceedsCommission },
  ];

  return (
    <>
      {/* Greeting + verification status (reference: "Hello, …" + Verified Seller). */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-600 text-lg font-bold text-white" aria-hidden="true">
            {shop.name.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl">{fmt(s.hello, { name: shop.name })}</h1>
            {verified ? (
              <span className="mt-0.5 inline-flex items-center gap-1 text-sm font-semibold text-brand-700">
                <BadgeCheck size={15} aria-hidden="true" /> {t.product.verifiedSeller}
              </span>
            ) : (
              <span className="mt-0.5 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                {s.awaitingApproval}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/customer/shops/${shop.slug}`}
            className="inline-flex h-10 items-center gap-1.5 rounded-full border border-line bg-white px-3.5 text-xs font-semibold text-ink transition hover:border-brand-400 hover:text-brand-800"
          >
            <Eye size={14} aria-hidden="true" /> View Storefront
          </Link>
          <ShareAction
            title={shop.name}
            text={`Tembelea duka letu la ${shop.name} kwenye Kariakoo App! Nunua mtandaoni na uletewe popote Dar es Salaam.`}
            url={`/customer/shops/${shop.slug}`}
            label="Share Shop"
          />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={s.statProducts} value={String(summary.productCount)} hint={fmt(s.activeCount, { count: summary.activeProducts })} icon={<Package size={18} />} />
        <StatCard label={s.statPending} value={String(summary.pendingOrders)} hint={s.awaitingFulfilment} icon={<Timer size={18} />} />
        <StatCard label={s.statAllOrders} value={String(summary.orderCount)} hint={s.containingYours} icon={<ClipboardList size={18} />} />
        <StatCard label={s.statLowStock} value={String(summary.lowStock)} hint={s.lowStockHint} icon={<AlertTriangle size={18} />} />
      </div>

      <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-muted">{s.quickActions}</h2>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {actions.map(({ href, Icon, title, sub }) => (
          <li key={title}>
            <Link href={href} className="flex h-full items-start gap-3 rounded-2xl border border-line bg-white p-4 transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-sm">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700"><Icon size={18} aria-hidden="true" /></span>
              <span className="min-w-0">
                <span className="block font-semibold">{title}</span>
                <span className="block text-xs text-muted">{sub}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <SellerShopLocation
        shopName={shop.name}
        initialLocation={shop.lat !== null && shop.lng !== null ? [shop.lng, shop.lat] : null}
        labels={{
          title: s.locationTitle,
          description: s.locationDescription,
          mapLabel: s.locationMapLabel,
          selected: s.locationSelected,
          notSelected: s.locationNotSelected,
          save: s.locationSave,
          saving: s.saving,
          remove: s.locationRemove,
          saved: s.locationSaved,
        }}
      />

      <Card className="mt-8" aria-labelledby="inventory">
        <CardHeader id="inventory" title={s.inventory} action={<Link href="/seller/products" className="text-sm font-medium text-brand-700 hover:underline">{s.manageProducts}</Link>} />
        {products.length === 0 ? (
          <p className="text-sm text-muted">{s.noProductsYet}</p>
        ) : (
          <ul className="divide-y divide-line text-sm">
            {products.slice(0, 8).map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                <span className="font-medium">{p.name}</span>
                <span className="text-muted">{fmt(s.inStockStatus, { count: p.stock, status: s.productStatus[p.status as keyof typeof s.productStatus] ?? p.status })}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
