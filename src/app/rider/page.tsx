import { Bike, ClipboardList, DollarSign, MapPin, Truck, Wallet } from "lucide-react";
import Link from "next/link";
import { LiveOfferList } from "@/components/rider/LiveOfferList";
import { DeliveryStatusBadge } from "@/components/orders/StatusBadges";
import { Card, CardHeader, PageHeader, StatCard } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/States";
import { TrendBars, lastSevenDays } from "@/components/dashboard/TrendBars";
import { requireRole } from "@/lib/auth/session";
import { riderJobs, riderOffers } from "@/lib/data/rider-live";
import { formatDateTime, formatTzs } from "@/lib/format";
import { darDate } from "@/lib/rider-earnings";

const ACTIVE = ["ACCEPTED", "PICKED_UP", "IN_TRANSIT"];

export default async function RiderDashboardPage() {
  const session = await requireRole("rider");
  const jobs = await riderJobs(session);
  const offers = await riderOffers(session);

  const active = jobs.filter((j) => ACTIVE.includes(j.status));
  const todayKey = darDate(new Date().toISOString());
  const today = jobs.filter((j) => j.placedAt.startsWith(todayKey));
  const delivered = today.filter((j) => j.status === "DELIVERED");
  const earned = delivered.reduce((s, j) => s + j.payoutTzs, 0);
  const cash = jobs.filter((j) => j.status === "DELIVERED" && j.cashToCollectTzs > 0).reduce((s, j) => s + j.cashToCollectTzs, 0);
  const trend = lastSevenDays(
    jobs.map((j) => ({ at: j.placedAt, amountTzs: j.payoutTzs })),
    todayKey,
  );

  return (
    <>
      <PageHeader
        title="Your deliveries"
        description="Live delivery activity assigned to your rider account."
      />

      <div className="mb-6"><LiveOfferList offers={offers} /></div>

      {/* Top metrics row. */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Active jobs" value={String(active.length)} icon={<Bike size={18} />} hint="On the way right now" />
        <StatCard label="Today's jobs" value={String(today.length)} icon={<ClipboardList size={18} />} hint="Assigned to you" />
        <StatCard label="Today's earnings" value={formatTzs(earned)} icon={<DollarSign size={18} />} hint="Delivered and settled" />
        <StatCard label="Cash to collect" value={formatTzs(cash)} icon={<Wallet size={18} />} hint="Cash-on-delivery orders" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        {/* Earnings trend. */}
        <Card aria-labelledby="earnings">
          <TrendBars title="Your earnings, last 7 days" caption="Delivery payouts from completed jobs" points={trend} />
        </Card>

        {/* Active job (only one shown, the most urgent). */}
        {active.length > 0 && (
          <Card aria-labelledby="current-job">
            <CardHeader id="current-job" title="Job in progress" subtitle={`Pick up from ${active[0].pickups.length} shop(s), deliver to ${active[0].dropoffAddress}`} />
            <div className="space-y-4 text-sm">
              <div className="grid gap-3 md:grid-cols-2">
                {[
                  { Icon: MapPin, label: "Pickup", value: active[0].pickups.map((p) => p.shopName).join(", ") },
                  { Icon: Truck, label: "Dropoff", value: active[0].dropoffAddress },
                ].map(({ Icon, label, value }) => (
                  <div key={label} className="flex items-center gap-2">
                    <Icon size={16} className="text-brand-600 shrink-0" aria-hidden="true" />
                    <div>
                      <p className="text-xs text-muted uppercase tracking-wider">{label}</p>
                      <p className="font-medium">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-2 rounded-xl border border-line bg-white p-3">
                <DeliveryStatusBadge status={active[0].status} />
              </div>
              <Link href={`/rider/jobs/${active[0].orderId}`} className="text-sm font-medium text-brand-700 hover:underline">Manage job →</Link>
            </div>
          </Card>
        )}
      </div>

      {/* Recent jobs history. */}
      <Card aria-labelledby="recent-jobs" className="mt-6">
        <CardHeader id="recent-jobs" title="Recent jobs" action={<Link href="/rider/jobs" className="text-sm font-medium text-brand-700 hover:underline">All jobs</Link>} />
        {jobs.length === 0 ? <EmptyState title="No deliveries assigned yet" body="New delivery offers will appear here when dispatch sends one to you." /> : <ul className="divide-y divide-line">
          {jobs.slice(0, 6).map((j) => (
            <li key={j.orderId} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
              <div>
                <p className="font-medium">{j.reference}</p>
                <p className="text-xs text-muted">{formatDateTime(j.placedAt)}</p>
              </div>
              <DeliveryStatusBadge status={j.status} />
              <p className="font-semibold tabular-nums">{formatTzs(j.payoutTzs)}</p>
            </li>
          ))}
        </ul>}
      </Card>
    </>
  );
}
