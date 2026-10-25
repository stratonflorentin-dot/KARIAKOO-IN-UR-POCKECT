import { AlertTriangle, Banknote, Bike, CheckCircle2, ChevronRight, ClipboardList, Store, Truck, User } from "lucide-react";
import Link from "@/components/i18n/Link";
import { Card, CardHeader, PageHeader, StatCard } from "@/components/ui/Card";
import { requireRole } from "@/lib/auth/session";
import { liveAdminOverview } from "@/lib/data/admin-live";
import { formatDateTime, formatTzs } from "@/lib/format";

export default async function AdminOverviewPage() {
  const session = await requireRole("admin");
  const live = await liveAdminOverview(session);
  const queues = [
    ...(live.openIncidents > 0
      ? [{ count: live.openIncidents, label: "Safety alerts (SOS)", sub: "urgent rider reports", href: "/admin/disputes", Icon: AlertTriangle, urgent: true }]
      : []),
    { count: live.pendingShops, label: "Seller applications", sub: "awaiting review", href: "/admin/shops", Icon: Store, urgent: false },
    { count: live.pendingRiders, label: "Rider applications", sub: "awaiting review", href: "/admin/riders", Icon: Bike, urgent: false },
    { count: live.pendingOrders, label: "Orders awaiting fulfilment", sub: "shop hasn't accepted", href: "/admin/orders", Icon: ClipboardList, urgent: false },
  ].filter((q) => q.count > 0);

  return <>
    <PageHeader title="KARIAKOO" description="Live marketplace overview from Supabase." />

    <section aria-labelledby="action-needed" className="mb-6">
      <h2 id="action-needed" className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Action needed</h2>
      {queues.length === 0 ? (
        <p className="flex items-center gap-2 rounded-2xl border border-line bg-subtle p-4 text-sm text-muted">
          <CheckCircle2 size={18} className="text-brand-600" aria-hidden="true" /> All clear — nothing is waiting on you right now.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-3">
          {queues.map(({ count, label, sub, href, Icon, urgent }) => (
            <li key={href}>
              <Link
                href={href}
                className={`flex items-center gap-3 rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-sm ${
                  urgent
                    ? "border-red-300 bg-red-50/50 hover:border-red-400"
                    : "border-line bg-white hover:border-brand-300"
                }`}
              >
                <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${
                  urgent ? "bg-red-100 text-red-700 animate-pulse" : "bg-amber-100 text-amber-800"
                }`}>
                  <Icon size={18} aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-2xl font-bold tabular-nums leading-none ${urgent ? "text-red-700" : ""}`}>{count}</span>
                  <span className="block text-sm font-medium">{label}</span>
                  <span className="block text-xs text-muted">{sub}</span>
                </span>
                <ChevronRight size={18} className="shrink-0 text-muted" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>

    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard label="Orders" value={String(live.orders)} icon={<ClipboardList size={18} />} hint="All time" />
      <StatCard label="Paid GMV" value={formatTzs(live.paidGmvTzs)} icon={<Banknote size={18} />} hint="Most recent six orders" />
      <StatCard label="Shops" value={String(live.shops)} icon={<Store size={18} />} hint={`${live.pendingShops} awaiting approval`} />
      <StatCard label="Pending fulfilment" value={String(live.pendingOrders)} icon={<AlertTriangle size={18} />} hint="Awaiting seller action" />
      <StatCard label="Customers" value={String(live.customers)} icon={<User size={18} />} hint="Registered customer roles" />
      <StatCard label="Approved riders" value={String(live.riders)} icon={<Bike size={18} />} hint="Delivery partners" />
      <StatCard label="Active products" value={String(live.products)} icon={<Truck size={18} />} hint="Currently listed" />
      <StatCard label="Open incidents" value={String(live.openIncidents)} icon={<AlertTriangle size={18} />} hint="Safety &amp; SOS queue" />
    </div>
    <Card aria-labelledby="recent-orders" className="mt-6">
      <CardHeader id="recent-orders" title="Recent orders" subtitle="Latest orders and merchandise totals." action={<Link href="/admin/orders" className="text-sm font-medium text-brand-700 hover:underline">All orders</Link>} />
      {live.recent.length === 0 ? <p className="text-sm text-muted">No live orders yet.</p> : <ul className="divide-y divide-line text-sm">{live.recent.map((o) => <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-3"><div><p className="font-medium">{o.reference}</p><p className="text-xs text-muted">{formatDateTime(o.createdAt)}</p></div><span className="capitalize text-muted">{o.paymentStatus}</span><span className="font-semibold tabular-nums">{formatTzs(o.totalTzs)}</span></li>)}</ul>}
    </Card>
  </>;
}
