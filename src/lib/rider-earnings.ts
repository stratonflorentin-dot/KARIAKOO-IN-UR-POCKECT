// Rider earnings: totals for today and this week, and which payouts are
// already paid. Riders are paid weekly, every Monday, for deliveries
// completed up to the previous Sunday (Dar es Salaam time).

export interface EarningJob {
  orderId: string;
  reference: string;
  payoutTzs: number;
  deliveredAt: string;
}

export interface EarningsSummary {
  todayTzs: number;
  weekTzs: number;
  paidTzs: number;
  pendingTzs: number;
  deliveredToday: number;
  deliveredThisWeek: number;
  /** Date (YYYY-MM-DD) of the next Monday payout. */
  nextPayoutDate: string;
  jobs: (EarningJob & { paid: boolean })[];
}

const TZ_OFFSET_MS = 3 * 3_600_000; // Africa/Dar_es_Salaam is UTC+3 all year

/** Local calendar date (YYYY-MM-DD) in Dar es Salaam. */
export function darDate(iso: string): string {
  return new Date(new Date(iso).getTime() + TZ_OFFSET_MS).toISOString().slice(0, 10);
}

/** Monday (YYYY-MM-DD) of the week containing `date`. */
export function weekStart(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  const daysSinceMonday = (d.getUTCDay() + 6) % 7;
  return new Date(d.getTime() - daysSinceMonday * 86_400_000).toISOString().slice(0, 10);
}

export function riderEarnings(jobs: EarningJob[], today: string): EarningsSummary {
  const monday = weekStart(today);
  const nextPayoutDate = new Date(new Date(`${monday}T00:00:00Z`).getTime() + 7 * 86_400_000).toISOString().slice(0, 10);
  const rows = jobs
    .map((j) => ({ ...j, paid: darDate(j.deliveredAt) < monday }))
    .sort((a, b) => b.deliveredAt.localeCompare(a.deliveredAt));

  const sum = (xs: typeof rows) => xs.reduce((s, j) => s + j.payoutTzs, 0);
  const todays = rows.filter((j) => darDate(j.deliveredAt) === today);
  const thisWeek = rows.filter((j) => darDate(j.deliveredAt) >= monday && darDate(j.deliveredAt) <= today);

  return {
    todayTzs: sum(todays),
    weekTzs: sum(thisWeek),
    paidTzs: sum(rows.filter((j) => j.paid)),
    pendingTzs: sum(rows.filter((j) => !j.paid)),
    deliveredToday: todays.length,
    deliveredThisWeek: thisWeek.length,
    nextPayoutDate,
    jobs: rows,
  };
}

/** Seconds left on a job offer, never negative. */
export function secondsLeft(expiresAtMs: number, nowMs: number): number {
  return Math.max(0, Math.ceil((expiresAtMs - nowMs) / 1000));
}
