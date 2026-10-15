import { ChevronRight, MapPin, Package, Store } from "lucide-react";
import Link from "next/link";
import { DeliveryStatusBadge } from "@/components/orders/StatusBadges";
import { DemoTag } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import { DEMO_TODAY } from "@/data/demo/meta";
import { requireRole } from "@/lib/auth/session";
import { riderJobs, riderProfile, type RiderJobView } from "@/lib/data/access";
import { getZone } from "@/lib/delivery";
import { formatTzs } from "@/lib/format";

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

export default async function RiderHomePage() {
  const session = await requireRole("rider");
  const jobs = riderJobs(session);
  const profile = riderProfile(session);
  const active = jobs.filter((j) => ACTIVE.includes(j.status));
  const offered = jobs.filter((j) => j.status === "ASSIGNED");
  const delivered = jobs.filter((j) => j.status === "DELIVERED");
  const deliveredToday = delivered.filter((j) => j.history.some((h) => h.at.startsWith(DEMO_TODAY) && h.label.startsWith("Delivered")));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted">Habari,</p>
          <h1 className="text-2xl font-bold tracking-tight">{profile?.name}</h1>
        </div>
        <DemoTag />
      </div>

      <dl className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-2xl bg-white p-3"><dt className="text-xs text-muted">Today</dt><dd className="text-xl font-bold">{deliveredToday.length}</dd></div>
        <div className="rounded-2xl bg-white p-3"><dt className="text-xs text-muted">All time</dt><dd className="text-xl font-bold">{delivered.length}</dd></div>
        <div className="rounded-2xl bg-white p-3"><dt className="text-xs text-muted">Earned</dt><dd className="text-sm font-bold leading-7">{formatTzs(delivered.reduce((s, j) => s + j.payoutTzs, 0))}</dd></div>
      </dl>

      <section aria-labelledby="active-heading">
        <h2 id="active-heading" className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Active delivery</h2>
        {active.length ? active.map((j) => <JobCard key={j.orderId} job={j} highlight />) : <EmptyState icon={<Package size={22} />} title="No active delivery" body="Accept a request below to start." />}
      </section>

      <section aria-labelledby="requests-heading">
        <h2 id="requests-heading" className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Delivery requests ({offered.length})</h2>
        {offered.length ? (
          <ul className="space-y-3">{offered.map((j) => <li key={j.orderId}><JobCard job={j} /></li>)}</ul>
        ) : (
          <p className="rounded-2xl bg-white p-4 text-sm text-muted">No requests right now. Dispatch offers jobs to riders who are online.</p>
        )}
      </section>

      <p className="text-xs text-muted">Earnings are calculated per delivery and paid weekly once settlement is live (Phase 6).</p>
    </div>
  );
}
