import { ChevronRight, MapPin, Package, Store } from "lucide-react";
import Link from "next/link";
import { MapLoader } from "@/components/map/MapLoader";
import { DeliveryStatusBadge } from "@/components/orders/StatusBadges";
import { AvailabilityBanner } from "@/components/rider/AvailabilityBanner";
import { IncomingOffer, type OfferView } from "@/components/rider/IncomingOffer";
import { DemoTag } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import { DEMO_TODAY } from "@/data/demo/meta";
import { requireRole } from "@/lib/auth/session";
import { riderDemandAreas, riderJobs, riderProfile, type RiderJobView } from "@/lib/data/access";
import { getZone } from "@/lib/delivery";
import { formatTzs } from "@/lib/format";
import { fmtDist, pathLength, type LngLat } from "@/lib/geo";
import { riderEarnings } from "@/lib/rider-earnings";

const ACTIVE = ["ACCEPTED", "PICKED_UP", "IN_TRANSIT"];

function JobCard({ job, highlight = false }: { job: RiderJobView; highlight?: boolean }) {
  return (
    <Link
      href={`/rider/jobs/${job.orderId}`}
      className={`block rounded-3xl p-4 transition active:scale-[0.99] ${highlight ? "bg-night text-white" : "border border-line bg-white"}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-lg font-bold">{job.reference}</span>
        <DeliveryStatusBadge status={job.status} />
      </div>
      <p className={`mt-3 flex items-start gap-2 text-sm ${highlight ? "text-white/80" : "text-muted"}`}>
        <Store size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        {job.pickups.map((p) => p.shopName).join(" + ")}
      </p>
      <p className={`mt-1 flex items-start gap-2 text-sm ${highlight ? "text-white/80" : "text-muted"}`}>
        <MapPin size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        {getZone(job.zone).name}
      </p>
      <div className="mt-3 flex items-center justify-between">
        <span className="font-semibold">You earn {formatTzs(job.payoutTzs)}</span>
        <ChevronRight aria-hidden="true" />
      </div>
    </Link>
  );
}

/** Route length from the shops to the drop-off, for the offer card. */
function jobDistance(job: RiderJobView): string {
  const pts = [...job.pickups.flatMap((p) => (p.geo ? [p.geo] : [])), ...(job.dropoffGeo ? [job.dropoffGeo] : [])] as LngLat[];
  return pts.length > 1 ? fmtDist(pathLength(pts)) : "a short distance";
}

export default async function RiderHomePage() {
  const session = await requireRole("rider");
  const jobs = riderJobs(session);
  const profile = riderProfile(session);
  const demand = riderDemandAreas(session);
  const active = jobs.filter((j) => ACTIVE.includes(j.status));
  const offered = jobs.filter((j) => j.status === "ASSIGNED");
  const earnings = riderEarnings(
    jobs.flatMap((j) => (j.status === "DELIVERED" && j.deliveredAt ? [{ orderId: j.orderId, reference: j.reference, payoutTzs: j.payoutTzs, deliveredAt: j.deliveredAt }] : [])),
    DEMO_TODAY,
  );

  // Before accepting, riders see the area, not the customer's exact address.
  const offers: OfferView[] = offered.map((j) => ({
    orderId: j.orderId,
    reference: j.reference,
    shops: j.pickups.map((p) => p.shopName),
    dropoffArea: getZone(j.zone).name,
    distance: jobDistance(j),
    payoutTzs: j.payoutTzs,
  }));

  return (
    <div className="space-y-6">
      {/* Full-screen request with a countdown while the rider is online. With an
          active delivery it is offered as the next job, like courier apps do. */}
      <IncomingOffer offers={offers} queued={active.length > 0} />

      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted">Habari,</p>
          <h1 className="text-2xl font-bold tracking-tight">{profile?.name}</h1>
        </div>
        <DemoTag />
      </div>

      <AvailabilityBanner />

      <Link href="/rider/earnings" className="flex items-center justify-between rounded-3xl bg-night p-4 text-white">
        <div>
          <p className="text-xs text-white/70">Today&apos;s earnings</p>
          <p className="text-2xl font-extrabold">{formatTzs(earnings.todayTzs)}</p>
          <p className="text-xs text-white/70">{earnings.deliveredToday} deliveries · this week {formatTzs(earnings.weekTzs)}</p>
        </div>
        <ChevronRight aria-hidden="true" />
      </Link>

      <section aria-labelledby="active-heading">
        <h2 id="active-heading" className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Active delivery</h2>
        {active.length ? active.map((j) => <JobCard key={j.orderId} job={j} highlight />) : <EmptyState icon={<Package size={22} />} title="No active delivery" body="New requests pop up here while you're online." />}
      </section>

      <section aria-labelledby="requests-heading">
        <h2 id="requests-heading" className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Delivery requests ({offered.length})</h2>
        {offered.length ? (
          <ul className="space-y-3">{offered.map((j) => <li key={j.orderId}><JobCard job={j} /></li>)}</ul>
        ) : (
          <p className="rounded-2xl bg-white p-4 text-sm text-muted">No requests right now. Dispatch offers jobs to riders who are online.</p>
        )}
      </section>

      {demand.length > 0 && (
        <section aria-labelledby="busy-heading">
          <h2 id="busy-heading" className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Busy areas now</h2>
          <MapLoader
            ariaLabel="Map of busy areas where orders are waiting for a rider"
            heightClass="h-64"
            locate
            heat={demand.map((d) => ({ geo: d.geo, weight: d.waiting }))}
            points={demand.map((d, i) => ({ id: `demand-${i}`, kind: "shop" as const, badge: String(d.waiting), label: `${d.shopName}: ${d.waiting} ${d.waiting === 1 ? "order" : "orders"} waiting for a rider`, geo: d.geo }))}
            note="Orange areas have orders waiting for a rider. Numbers show how many. Based on demo orders."
          />
        </section>
      )}
    </div>
  );
}
