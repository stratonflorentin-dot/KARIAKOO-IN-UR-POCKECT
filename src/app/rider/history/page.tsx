import type { Metadata } from "next";
import Link from "next/link";
import { DeliveryStatusBadge } from "@/components/orders/StatusBadges";
import { EmptyState } from "@/components/ui/States";
import { requireRole } from "@/lib/auth/session";
import { riderJobs } from "@/lib/data/rider-live";
import { formatDate, formatTzs } from "@/lib/format";

export const metadata: Metadata = { title: "History" };

const DONE = ["DELIVERED", "FAILED", "CANCELLED"];

export default async function RiderHistoryPage() {
  const jobs = (await riderJobs(await requireRole("rider"))).filter((j) => DONE.includes(j.status));
  const earned = jobs.filter((j) => j.status === "DELIVERED").reduce((s, j) => s + j.payoutTzs, 0);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Delivery history</h1>
      <div className="rounded-3xl bg-night p-5 text-white">
        <p className="text-sm text-white/70">Earnings from completed deliveries</p>
        <p className="text-3xl font-bold">{formatTzs(earned)}</p>
        <p className="mt-1 text-xs text-white/60">Based on completed deliveries recorded for your account.</p>
      </div>
      {jobs.length === 0 ? (
        <EmptyState title="No completed deliveries yet" />
      ) : (
        <ul className="space-y-2">
          {jobs.map((j) => (
            <li key={j.orderId}>
              <Link href={`/rider/jobs/${j.orderId}`} className="flex items-center justify-between gap-3 rounded-2xl bg-white p-4">
                <div>
                  <p className="font-semibold">{j.reference}</p>
                  <p className="text-xs text-muted">{formatDate(j.placedAt)} · {j.pickups.map((p) => p.shopName).join(", ")}</p>
                </div>
                <div className="text-right">
                  <DeliveryStatusBadge status={j.status} />
                  <p className="mt-1 text-sm font-semibold">{j.status === "DELIVERED" ? formatTzs(j.payoutTzs) : "—"}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
