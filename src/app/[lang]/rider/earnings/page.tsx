import type { Metadata } from "next";
import Link from "@/components/i18n/Link";
import { Banknote, Bike, CheckCircle2, ShieldCheck, Wallet } from "lucide-react";
import { PayoutAccountCard } from "@/components/finance/PayoutAccountCard";
import { StatCard } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/States";
import { fmt } from "@/i18n/config";
import { getDictionary } from "@/i18n/server";
import { requireRole } from "@/lib/auth/session";
import { getPayoutAccount } from "@/lib/data/finance";
import { riderJobs } from "@/lib/data/rider-live";
import { formatDate, formatDateTime, formatTzs } from "@/lib/format";
import { getZone } from "@/lib/delivery";

export const metadata: Metadata = { title: "Earnings" };

export default async function RiderEarningsPage() {
  const session = await requireRole("rider");
  const t = await getDictionary();
  const account = await getPayoutAccount(session);
  const updatedLabel = account ? fmt(t.finance.updated, { date: formatDate(account.updatedAt) }) : "";
  const completed = (await riderJobs(session))
    .filter((job) => job.status === "DELIVERED" && job.deliveredAt)
    .sort((a, b) => b.deliveredAt!.localeCompare(a.deliveredAt!));
  const recorded = completed.reduce((sum, job) => sum + job.payoutTzs, 0);
  const cashCollected = completed.reduce((sum, job) => sum + job.cashToCollectTzs, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Earnings &amp; Payouts</h1>
          <p className="text-sm text-muted">Track your delivery payouts and cash collection balance.</p>
        </div>
        {account && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3.5 py-1 text-xs font-semibold text-emerald-800">
            <CheckCircle2 size={14} className="text-emerald-600" aria-hidden="true" />
            Wallet connected: {account.provider.toUpperCase()}
          </span>
        )}
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-3xl bg-gradient-to-br from-night to-stone-900 p-5 text-white">
          <p className="text-xs uppercase tracking-wider text-white/70">Total Delivery Payouts</p>
          <p className="mt-1 text-3xl font-extrabold tabular-nums tracking-tight">{formatTzs(recorded)}</p>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-white/80">
            <Bike size={14} aria-hidden="true" />
            {completed.length} completed {completed.length === 1 ? "delivery" : "deliveries"}
          </p>
        </div>
        <StatCard
          label="COD Cash Collected"
          value={formatTzs(cashCollected)}
          icon={<Banknote size={18} />}
          hint="Reconciled with dispatch"
        />
        <StatCard
          label="Average Per Delivery"
          value={formatTzs(completed.length > 0 ? Math.round(recorded / completed.length) : 0)}
          icon={<Wallet size={18} />}
          hint="Gross fee per trip"
        />
      </div>

      <PayoutAccountCard account={account} updatedLabel={updatedLabel} />

      <section aria-labelledby="per-delivery">
        <h2 id="per-delivery" className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          Completed delivery payouts
        </h2>
        {completed.length === 0 ? (
          <EmptyState
            title="No completed deliveries yet"
            body="Completed deliveries verified with customer PIN will appear here with calculated payout."
          />
        ) : (
          <ul className="space-y-2">
            {completed.map((job) => (
              <li key={job.orderId}>
                <Link
                  href={`/rider/jobs/${job.orderId}`}
                  className="flex flex-col gap-2 rounded-2xl border border-line bg-white p-4 transition hover:border-brand-300 hover:shadow-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-ink">{job.reference}</span>
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                        PIN Verified
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted">
                      {formatDateTime(job.deliveredAt!)} · {getZone(job.zone).name} · {job.pickups.map((p) => p.shopName).join(", ")}
                    </p>
                  </div>
                  <div className="flex items-center justify-between sm:text-right">
                    {job.cashToCollectTzs > 0 && (
                      <span className="mr-3 text-xs text-muted">COD: {formatTzs(job.cashToCollectTzs)}</span>
                    )}
                    <span className="text-base font-bold tabular-nums text-brand-700 sm:text-lg">
                      +{formatTzs(job.payoutTzs)}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Operational reassurance note */}
      <div className="flex items-start gap-3 rounded-2xl border border-line bg-subtle p-4 text-xs text-muted">
        <ShieldCheck size={18} className="mt-0.5 shrink-0 text-brand-600" aria-hidden="true" />
        <p className="leading-relaxed">
          Delivery fees are credited upon customer PIN verification at the doorstep. Automated batch disbursements disburse directly to your registered mobile money account (M-Pesa, Airtel Money, Mixx, HaloPesa, or T-Pesa).
        </p>
      </div>
    </div>
  );
}
