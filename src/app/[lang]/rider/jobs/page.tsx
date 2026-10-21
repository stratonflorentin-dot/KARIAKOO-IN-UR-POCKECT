import type { Metadata } from "next";
import Link from "@/components/i18n/Link";
import { DeliveryStatusBadge } from "@/components/orders/StatusBadges";
import { PageHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/States";
import { requireRole } from "@/lib/auth/session";
import { riderJobs } from "@/lib/data/rider-live";
import { formatDateTime, formatTzs } from "@/lib/format";

export const metadata: Metadata = { title: "Delivery jobs" };

export default async function RiderJobsPage() {
  const jobs = await riderJobs(await requireRole("rider"));
  return <>
    <PageHeader title="Delivery jobs" description="Assigned deliveries and their current status." />
    {jobs.length === 0 ? <EmptyState title="No deliveries assigned yet" body="New delivery offers will appear on your dashboard." /> : <ul className="divide-y divide-line rounded-2xl bg-white px-4">{jobs.map((job) => <li key={job.orderId} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><Link href={`/rider/jobs/${job.orderId}`} className="font-semibold text-brand-800 hover:underline">{job.reference}</Link><p className="text-xs text-muted">{formatDateTime(job.placedAt)} · {job.pickups.map((p) => p.shopName).join(", ")}</p></div><DeliveryStatusBadge status={job.status} /><p className="font-semibold tabular-nums">{formatTzs(job.payoutTzs)}</p></li>)}</ul>}
  </>;
}
