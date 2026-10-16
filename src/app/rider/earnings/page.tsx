import type { Metadata } from "next";
import Link from "next/link";
import { Badge, DemoTag } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import { DEMO_TODAY } from "@/data/demo/meta";
import { requireRole } from "@/lib/auth/session";
import { riderJobs } from "@/lib/data/access";
import { formatDate, formatDateTime, formatTzs } from "@/lib/format";
import { riderEarnings } from "@/lib/rider-earnings";

export const metadata: Metadata = { title: "Earnings" };

export default async function RiderEarningsPage() {
  const jobs = riderJobs(await requireRole("rider")).flatMap((j) =>
    j.status === "DELIVERED" && j.deliveredAt ? [{ orderId: j.orderId, reference: j.reference, payoutTzs: j.payoutTzs, deliveredAt: j.deliveredAt }] : [],
  );
  // Demo data is a snapshot of one day; real data uses the current date.
  const e = riderEarnings(jobs, DEMO_TODAY);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Earnings</h1>
        <DemoTag />
      </div>

      <div className="rounded-3xl bg-night p-5 text-white">
        <p className="text-sm text-white/70">Today</p>
        <p className="text-4xl font-extrabold tracking-tight">{formatTzs(e.todayTzs)}</p>
        <p className="mt-1 text-sm text-white/70">{e.deliveredToday} {e.deliveredToday === 1 ? "delivery" : "deliveries"}</p>
      </div>

      <dl className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-white p-4"><dt className="text-xs text-muted">This week</dt><dd className="text-xl font-bold">{formatTzs(e.weekTzs)}</dd><dd className="text-xs text-muted">{e.deliveredThisWeek} deliveries</dd></div>
        <div className="rounded-2xl bg-white p-4"><dt className="text-xs text-muted">Waiting for payout</dt><dd className="text-xl font-bold">{formatTzs(e.pendingTzs)}</dd><dd className="text-xs text-muted">Paid Monday {formatDate(`${e.nextPayoutDate}T12:00:00+03:00`)}</dd></div>
        <div className="col-span-2 rounded-2xl bg-white p-4"><dt className="text-xs text-muted">Already paid to you</dt><dd className="text-xl font-bold">{formatTzs(e.paidTzs)}</dd></div>
      </dl>

      <section aria-labelledby="per-delivery">
        <h2 id="per-delivery" className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Per delivery</h2>
        {e.jobs.length === 0 ? (
          <EmptyState title="No completed deliveries yet" />
        ) : (
          <ul className="space-y-2">
            {e.jobs.map((j) => (
              <li key={j.orderId}>
                <Link href={`/rider/jobs/${j.orderId}`} className="flex items-center justify-between gap-3 rounded-2xl bg-white p-4">
                  <div>
                    <p className="font-semibold">{j.reference}</p>
                    <p className="text-xs text-muted">{formatDateTime(j.deliveredAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatTzs(j.payoutTzs)}</p>
                    <Badge tone={j.paid ? "success" : "warning"}>{j.paid ? "Paid" : "Pending"}</Badge>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-xs text-muted">
        Riders are paid every Monday for deliveries completed up to the previous Sunday. Demo figures: real payouts start with settlements (Phase 6).
      </p>
    </div>
  );
}
