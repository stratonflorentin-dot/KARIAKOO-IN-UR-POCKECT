import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/States";
import { requireRole } from "@/lib/auth/session";
import { riderJobs } from "@/lib/data/rider-live";
import { formatDateTime, formatTzs } from "@/lib/format";

export const metadata: Metadata = { title: "Earnings" };

export default async function RiderEarningsPage() {
  const completed = (await riderJobs(await requireRole("rider")))
    .filter((job) => job.status === "DELIVERED" && job.deliveredAt)
    .sort((a, b) => b.deliveredAt!.localeCompare(a.deliveredAt!));
  const recorded = completed.reduce((sum, job) => sum + job.payoutTzs, 0);

  return <div className="space-y-4">
    <h1 className="text-2xl font-bold tracking-tight">Earnings</h1>
    <Card className="bg-night text-white">
      <p className="text-sm text-white/70">Recorded delivery payouts</p>
      <p className="text-4xl font-extrabold tracking-tight">{formatTzs(recorded)}</p>
      <p className="mt-1 text-sm text-white/70">{completed.length} completed {completed.length === 1 ? "delivery" : "deliveries"}</p>
    </Card>
    <section aria-labelledby="per-delivery">
      <h2 id="per-delivery" className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Completed deliveries</h2>
      {completed.length === 0 ? <EmptyState title="No completed deliveries yet" /> : <ul className="space-y-2">{completed.map((job) => <li key={job.orderId}><Link href={`/rider/jobs/${job.orderId}`} className="flex items-center justify-between gap-3 rounded-2xl bg-white p-4"><div><p className="font-semibold">{job.reference}</p><p className="text-xs text-muted">{formatDateTime(job.deliveredAt!)}</p></div><p className="font-bold">{formatTzs(job.payoutTzs)}</p></Link></li>)}</ul>}
    </section>
    <p className="text-xs text-muted">This total is the payout recorded for delivered jobs. Settlement status is shown here once payouts are connected.</p>
  </div>;
}
