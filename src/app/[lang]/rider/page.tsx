import { Bike, ClipboardList, DollarSign, MapPin, Truck, Wallet } from "lucide-react";
import Link from "@/components/i18n/Link";
import { JobOfferModal } from "@/components/rider/JobOfferModal";
import { AvailableDeliveries } from "@/components/rider/AvailableDeliveries";
import { RiderDispatchPoller } from "@/components/rider/RiderDispatchPoller";
import { DeliveryStatusBadge } from "@/components/orders/StatusBadges";
import { Card, CardHeader, PageHeader, StatCard } from "@/components/ui/Card";
import { EmptyState, Notice } from "@/components/ui/States";
import { TrendBars, lastSevenDays } from "@/components/dashboard/TrendBars";
import { requireRole } from "@/lib/auth/session";
import { riderAvailableDeliveries, riderJobs, riderOffers } from "@/lib/data/rider-live";
import { formatDateTime, formatTzs } from "@/lib/format";
import { darDate } from "@/lib/rider-earnings";

const ACTIVE = ["ACCEPTED", "PICKED_UP", "IN_TRANSIT"];

export default async function RiderDashboardPage() {
  const session = await requireRole("rider");
  const jobs = await riderJobs(session);
  const offers = await riderOffers(session);
  const available = await riderAvailableDeliveries(session);

  const active = jobs.filter((j) => ACTIVE.includes(j.status));
  // Assigned (just offered/accepted) + active jobs — what the rider acts on now.
  const toHandle = jobs.filter((j) => ["ASSIGNED", ...ACTIVE].includes(j.status));
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
      <RiderDispatchPoller />
      <PageHeader
        title="Your deliveries"
        description="Live delivery activity assigned to your rider account."
      />

      <JobOfferModal offers={offers} />
      <AvailableDeliveries deliveries={available} />

      {active.length > 0 && offers.length === 0 && (
        <div className="mt-4">
          <Notice>Your next delivery offer will arrive after you complete this active delivery.</Notice>
        </div>
      )}

      {/* Top metrics row. */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Active jobs" value={String(active.length)} icon={<Bike size={18} />} hint="On the way right now" />
        <StatCard label="Today's jobs" value={String(today.length)} icon={<ClipboardList size={18} />} hint="Assigned to you" />
        <StatCard label="Today's earnings" value={formatTzs(earned)} icon={<DollarSign size={18} />} hint="Delivered and settled" />
        <StatCard label="Cash to collect" value={formatTzs(cash)} icon={<Wallet size={18} />} hint="Cash-on-delivery orders" />
      </div>

      {/* Today's deliveries: assigned + active jobs as pickup → dropoff cards. */}
      {toHandle.length > 0 && (
        <section aria-labelledby="to-handle" className="mt-6">
          <h2 id="to-handle" className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Deliveries to handle</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {toHandle.map((j) => (
              <li key={j.orderId}>
                <article className="flex h-full flex-col rounded-2xl border border-line bg-white p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{j.reference}</span>
                    <span className="font-semibold tabular-nums">{formatTzs(j.payoutTzs)}</span>
                  </div>
                  <div className="mt-1"><DeliveryStatusBadge status={j.status} /></div>
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700"><MapPin size={13} aria-hidden="true" /></span>
                      <div className="min-w-0"><p className="text-xs uppercase tracking-wider text-muted">Pickup</p><p className="truncate font-medium">{j.pickups.map((p) => p.shopName).join(", ")}</p></div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-stone-100 text-ink"><Truck size={13} aria-hidden="true" /></span>
                      <div className="min-w-0"><p className="text-xs uppercase tracking-wider text-muted">Dropoff</p><p className="truncate font-medium">{j.dropoffAddress}</p></div>
                    </div>
                  </div>
                  {j.cashToCollectTzs > 0 && (
                    <p className="mt-3 rounded-xl bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-800">Collect cash: {formatTzs(j.cashToCollectTzs)}</p>
                  )}
                  <Link href={`/rider/jobs/${j.orderId}`} className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-full bg-brand-600 font-semibold text-white transition hover:bg-brand-700">
                    {j.status === "ASSIGNED" ? "Open & accept" : "Open delivery"}
                  </Link>
                </article>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Earnings trend. */}
      <Card aria-labelledby="earnings" className="mt-6">
        <TrendBars title="Your earnings, last 7 days" caption="Delivery payouts from completed jobs" points={trend} />
      </Card>

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
