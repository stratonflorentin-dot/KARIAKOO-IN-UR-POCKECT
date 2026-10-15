import { CircleAlert, Database } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { TrendBars, lastSevenDays } from "@/components/dashboard/TrendBars";
import { OrderStatusBadge } from "@/components/orders/StatusBadges";
import { Badge, DemoTag } from "@/components/ui/Badge";
import { Card, CardHeader, PageHeader, StatCard } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/States";
import { DEMO_TODAY } from "@/data/demo/meta";
import { platformMetrics } from "@/lib/admin-metrics";
import { requireRole } from "@/lib/auth/session";
import { formatDateTime, formatTzs } from "@/lib/format";
import { breakdown } from "@/lib/money";
import { getSupabaseStatus } from "@/lib/supabase/status";

export default async function AdminOverviewPage() {
  const m = platformMetrics(await requireRole("admin"));
  const trend = lastSevenDays(m.sales.map((o) => ({ at: o.placedAt, amountTzs: breakdown(o.items).merchandiseTzs })), DEMO_TODAY);
  const attentionCount = Object.values(m.attention).reduce((s, list) => s + list.length, 0);

  return (
    <>
      <PageHeader title="Marketplace overview" description="All figures are calculated from demo data." actions={<DemoTag />} />

      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Sales volume</h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total orders" value={String(m.totalOrders)} />
        <StatCard label="Gross merchandise value (GMV)" value={formatTzs(m.gmvTzs)} hint="Goods sold through KARIAKOO. Not revenue." />
        <StatCard label="Refunds" value={formatTzs(m.refundsTzs)} />
        <StatCard label="Pending payments" value={formatTzs(m.pendingPaymentsTzs)} hint={`${m.pendingPaymentsCount} order(s) awaiting provider confirmation`} />
      </div>

      <h2 className="mb-2 mt-6 text-sm font-semibold uppercase tracking-wide text-muted">KARIAKOO revenue</h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Commission revenue" value={formatTzs(m.commissionTzs)} hint="From paid sales" />
        <StatCard label="Delivery fees collected" value={formatTzs(m.deliveryFeesTzs)} />
        <StatCard label="Rider payouts" value={formatTzs(m.riderPayoutsTzs)} hint="Delivery cost" />
        <StatCard label="Delivery contribution" value={formatTzs(m.deliveryContributionTzs)} hint="Fees minus rider payouts" />
        <StatCard label="Estimated operating costs" value="Not tracked" hint="Add cost data to see net contribution" />
        <StatCard label="Pending seller settlements" value={formatTzs(m.pendingSettlementTzs)} />
        <StatCard label="Active shops / riders" value={`${m.activeShops} / ${m.activeRiders}`} />
        <StatCard label="Active customers" value={String(m.activeCustomers)} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card aria-labelledby="gmv-trend">
          <TrendBars title="GMV, last 7 days" caption="Paid, non-cancelled orders (demo data)" points={trend} />
        </Card>

        <Card aria-labelledby="attention-heading">
          <CardHeader id="attention-heading" title={`Needs attention (${attentionCount})`} />
          <ul className="space-y-2 text-sm">
            {m.attention.awaitingRider.map((o) => (
              <li key={`r-${o.id}`} className="flex items-center justify-between gap-2"><Link href={`/admin/orders/${o.id}`} className="font-medium hover:underline">{o.reference}</Link><Badge tone="warning">Waiting for rider</Badge></li>
            ))}
            {m.attention.failedDeliveries.map((o) => (
              <li key={`f-${o.id}`} className="flex items-center justify-between gap-2"><Link href={`/admin/orders/${o.id}`} className="font-medium hover:underline">{o.reference}</Link><Badge tone="danger">Delivery failed</Badge></li>
            ))}
            {m.attention.awaitingSeller.map((o) => (
              <li key={`s-${o.id}`} className="flex items-center justify-between gap-2"><Link href={`/admin/orders/${o.id}`} className="font-medium hover:underline">{o.reference}</Link><Badge tone="info">Awaiting seller</Badge></li>
            ))}
            {m.attention.pendingShops.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2"><Link href="/admin/shops" className="font-medium hover:underline">{s.name}</Link><Badge>Shop application</Badge></li>
            ))}
            {m.attention.pendingRiders.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2"><Link href="/admin/riders" className="font-medium hover:underline">{r.name}</Link><Badge>Rider application</Badge></li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card aria-labelledby="recent-heading">
          <CardHeader id="recent-heading" title="Recent activity" action={<Link href="/admin/orders" className="text-sm font-medium text-brand-700 hover:underline">All orders</Link>} />
          <ul className="divide-y divide-line text-sm">
            {[...m.sales].sort((a, b) => b.placedAt.localeCompare(a.placedAt)).slice(0, 5).map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <Link href={`/admin/orders/${o.id}`} className="font-medium hover:underline">{o.reference}</Link>
                <span className="text-xs text-muted">{formatDateTime(o.placedAt)}</span>
                <OrderStatusBadge status={o.status} />
              </li>
            ))}
          </ul>
        </Card>
        <Card aria-labelledby="systems-heading">
          <CardHeader id="systems-heading" title="Systems" />
          <Suspense fallback={<Skeleton className="h-10" />}>
            <SupabaseStatusRow />
          </Suspense>
          <p className="mt-3 flex items-start gap-2 text-sm text-muted">
            <CircleAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            Payments: no provider connected. Orders cannot be paid online yet.
          </p>
        </Card>
      </div>
    </>
  );
}

async function SupabaseStatusRow() {
  const s = await getSupabaseStatus();
  return (
    <p className="flex items-start gap-2 text-sm">
      <Database size={16} className="mt-0.5 shrink-0 text-brand-600" aria-hidden="true" />
      <span>
        Supabase:{" "}
        {s.state === "reachable" ? <Badge tone="success">Connected</Badge> : s.state === "unreachable" ? <Badge tone="danger">Unreachable ({s.detail})</Badge> : <Badge>Not configured</Badge>}
        <span className="mt-1 block text-xs text-muted">Live check of the Auth service. Database tables and security rules are created in Phase 2; the app still reads demo data.</span>
      </span>
    </p>
  );
}
