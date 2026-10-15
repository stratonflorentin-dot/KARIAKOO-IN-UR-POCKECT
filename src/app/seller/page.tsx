import { AlertTriangle, Banknote, ClipboardList, Package, Percent, ShoppingBag, Timer, Wallet } from "lucide-react";
import Link from "next/link";
import { FulfillmentBadge } from "@/components/orders/StatusBadges";
import { ShopKindBadge } from "@/components/shop/ShopMark";
import { DemoTag } from "@/components/ui/Badge";
import { Card, CardHeader, PageHeader, StatCard } from "@/components/ui/Card";
import { TrendBars, lastSevenDays } from "@/components/dashboard/TrendBars";
import { DEMO_TODAY } from "@/data/demo/meta";
import { requireRole } from "@/lib/auth/session";
import { sellerOrders, sellerProducts, sellerShop } from "@/lib/data/access";
import { formatDateTime, formatTzs } from "@/lib/format";
import { breakdown } from "@/lib/money";

/** Orders count as sales once paid and not cancelled/rejected. */
const isSale = (v: { paymentStatus: string; group: { status: string } }) =>
  v.paymentStatus === "successful" && !["rejected", "cancelled"].includes(v.group.status);

export default async function SellerDashboardPage() {
  const session = await requireRole("seller");
  const shop = sellerShop(session);
  const orders = sellerOrders(session);
  const products = sellerProducts(session).filter((p) => p.status === "active");
  if (!shop) return null;

  const sales = orders.filter(isSale);
  const totals = breakdown(sales.flatMap((o) => o.items));
  const today = breakdown(sales.filter((o) => o.placedAt.startsWith(DEMO_TODAY)).flatMap((o) => o.items));
  const pending = orders.filter((o) => ["awaiting_seller", "accepted", "preparing"].includes(o.group.status));
  const settled = breakdown(sales.filter((o) => o.group.settlement === "settled").flatMap((o) => o.items));
  const due = totals.sellerProceedsTzs - settled.sellerProceedsTzs;
  const lowStock = products.filter((p) => p.stock <= 5);
  const trend = lastSevenDays(sales.map((o) => ({ at: o.placedAt, amountTzs: breakdown(o.items).merchandiseTzs })), DEMO_TODAY);

  return (
    <>
      <PageHeader
        title={`Karibu, ${shop.name}`}
        description={`${shop.address} · figures from demo orders, “today” = ${DEMO_TODAY}`}
        actions={<><ShopKindBadge shop={shop} /><DemoTag /></>}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Today's sales" value={formatTzs(today.merchandiseTzs)} icon={<ShoppingBag size={18} />} hint="Paid orders today" />
        <StatCard label="Total sales" value={formatTzs(totals.merchandiseTzs)} icon={<Banknote size={18} />} hint={`${sales.length} paid orders`} />
        <StatCard label="Orders" value={String(orders.length)} icon={<ClipboardList size={18} />} hint="All time, including cancelled" />
        <StatCard label="Pending orders" value={String(pending.length)} icon={<Timer size={18} />} hint="Need your action" />
        <StatCard label="Products in stock" value={`${products.filter((p) => p.stock > 0).length} / ${products.length}`} icon={<Package size={18} />} hint="Active listings" />
        <StatCard label="Low-stock alerts" value={String(lowStock.length)} icon={<AlertTriangle size={18} />} hint="5 or fewer left" />
        <StatCard label="Commission charged" value={formatTzs(totals.commissionTzs)} icon={<Percent size={18} />} hint="By KARIAKOO, on paid sales" />
        <StatCard label="Amount due to you" value={formatTzs(due)} icon={<Wallet size={18} />} hint="Not yet settled" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card aria-labelledby="trend">
          <TrendBars title="Sales, last 7 days" caption="Merchandise value of paid orders (demo data)" points={trend} />
        </Card>

        <Card aria-labelledby="stock-alerts">
          <CardHeader id="stock-alerts" title="Low-stock alerts" action={<Link href="/seller/products" className="text-sm font-medium text-brand-700 hover:underline">Manage</Link>} />
          {lowStock.length === 0 ? (
            <p className="text-sm text-muted">All products are well stocked.</p>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {lowStock.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="font-medium">{p.name}</span>
                  <span className={p.stock === 0 ? "font-semibold text-red-700" : "font-semibold text-amber-800"}>{p.stock === 0 ? "Out of stock" : `${p.stock} left`}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card aria-labelledby="recent-orders" className="mt-6">
        <CardHeader id="recent-orders" title="Recent orders" action={<Link href="/seller/orders" className="text-sm font-medium text-brand-700 hover:underline">All orders</Link>} />
        <ul className="divide-y divide-line">
          {orders.slice(0, 5).map((o) => (
            <li key={o.orderId} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
              <div>
                <p className="font-medium">{o.reference} · {o.customerFirstName}</p>
                <p className="text-xs text-muted">{formatDateTime(o.placedAt)}</p>
              </div>
              <FulfillmentBadge status={o.group.status} />
              <p className="font-semibold tabular-nums">{formatTzs(breakdown(o.items).merchandiseTzs)}</p>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
