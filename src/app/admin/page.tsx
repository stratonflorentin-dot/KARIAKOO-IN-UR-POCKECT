import { AlertTriangle, Banknote, Bike, ClipboardList, Store, Truck, User } from "lucide-react";
import Link from "next/link";
import { Card, CardHeader, PageHeader, StatCard } from "@/components/ui/Card";
import { requireRole } from "@/lib/auth/session";
import { liveAdminOverview } from "@/lib/data/admin-live";
import { formatDateTime, formatTzs } from "@/lib/format";

export default async function AdminOverviewPage() {
  const session = await requireRole("admin");
  const live = await liveAdminOverview(session);
  return <>
    <PageHeader title="KARIAKOO" description="Live marketplace overview from Supabase." />
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard label="Orders" value={String(live.orders)} icon={<ClipboardList size={18} />} hint="All time" />
      <StatCard label="Paid GMV" value={formatTzs(live.paidGmvTzs)} icon={<Banknote size={18} />} hint="Most recent six orders" />
      <StatCard label="Shops" value={String(live.shops)} icon={<Store size={18} />} hint={`${live.pendingShops} awaiting approval`} />
      <StatCard label="Pending fulfilment" value={String(live.pendingOrders)} icon={<AlertTriangle size={18} />} hint="Awaiting seller action" />
      <StatCard label="Customers" value={String(live.customers)} icon={<User size={18} />} hint="Registered customer roles" />
      <StatCard label="Approved riders" value={String(live.riders)} icon={<Bike size={18} />} hint="Delivery partners" />
      <StatCard label="Active products" value={String(live.products)} icon={<Truck size={18} />} hint="Currently listed" />
    </div>
    <Card aria-labelledby="recent-orders" className="mt-6">
      <CardHeader id="recent-orders" title="Recent orders" subtitle="Latest orders and merchandise totals." action={<Link href="/admin/orders" className="text-sm font-medium text-brand-700 hover:underline">All orders</Link>} />
      {live.recent.length === 0 ? <p className="text-sm text-muted">No live orders yet.</p> : <ul className="divide-y divide-line text-sm">{live.recent.map((o) => <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-3"><div><p className="font-medium">{o.reference}</p><p className="text-xs text-muted">{formatDateTime(o.createdAt)}</p></div><span className="capitalize text-muted">{o.paymentStatus}</span><span className="font-semibold tabular-nums">{formatTzs(o.totalTzs)}</span></li>)}</ul>}
    </Card>
  </>;
}
