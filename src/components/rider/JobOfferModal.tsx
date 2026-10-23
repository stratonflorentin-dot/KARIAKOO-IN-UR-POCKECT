"use client";

// Bolt-style dispatch popup: the newest live offer shown as a modal with a
// ticking countdown ring and Accept / Decline. Full pickup and drop-off details
// appear on the job page after accepting — before then, RLS keeps the customer's
// address private (the rider isn't assigned yet), so the offer shows the payout
// and timer only.
import { Bike, Wallet } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { acceptOffer, declineOffer } from "@/app/[lang]/rider/actions";
import { useI18n } from "@/i18n/client";
import { localizePath } from "@/i18n/config";
import { formatTzs } from "@/lib/format";
import { secondsLeft } from "@/lib/rider-earnings";

export interface RiderOffer {
  orderId: string;
  payoutTzs: number;
  expiresAt: string;
}

// Offers are dispatched with a 45s window (see auto_dispatch_delivery); used to
// scale the countdown ring.
const OFFER_WINDOW_S = 45;
const RING = 2 * Math.PI * 34; // r = 34

export function JobOfferModal({ offers }: { offers: RiderOffer[] }) {
  const router = useRouter();
  const { locale } = useI18n();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [now, setNow] = useState(() => Date.now());

  // Act on the soonest-expiring offer first.
  const current = useMemo(
    () => [...offers].sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime())[0],
    [offers],
  );

  useEffect(() => {
    if (!current) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [current]);

  const left = current ? secondsLeft(new Date(current.expiresAt).getTime(), now) : 0;

  // When the window runs out, drop the modal and refetch so a stale offer clears.
  useEffect(() => {
    if (current && left <= 0) router.refresh();
  }, [current, left, router]);

  if (!current || left <= 0) return null;

  async function decide(accept: boolean) {
    setBusy(true);
    setMessage("");
    const res = accept ? await acceptOffer(current!.orderId) : await declineOffer(current!.orderId);
    if (!res.ok) {
      setBusy(false);
      setMessage(res.message);
      // Another rider likely took it; refresh shortly to clear the offer.
      setTimeout(() => router.refresh(), 1200);
      return;
    }
    if (accept) {
      router.push(localizePath(locale, `/rider/jobs/${current!.orderId}`));
      return;
    }
    setBusy(false);
    router.refresh();
  }

  const pct = Math.max(0, Math.min(1, left / OFFER_WINDOW_S));
  const urgent = left <= 10;

  return (
    <div role="dialog" aria-modal="true" aria-label="New delivery offer"
      className="fixed inset-0 z-[60] grid place-items-end bg-black/50 p-4 sm:place-items-center">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-center gap-2 text-brand-700">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-50"><Bike size={18} aria-hidden="true" /></span>
          <p className="text-sm font-semibold uppercase tracking-wide">New delivery offer</p>
        </div>

        <div className="mt-5 flex items-center gap-5">
          {/* Countdown ring */}
          <div className="relative grid h-24 w-24 shrink-0 place-items-center">
            <svg viewBox="0 0 80 80" className="h-24 w-24 -rotate-90">
              <circle cx="40" cy="40" r="34" fill="none" stroke="#e7e5e4" strokeWidth="6" />
              <circle cx="40" cy="40" r="34" fill="none" strokeWidth="6" strokeLinecap="round"
                stroke={urgent ? "#dc2626" : "#059669"}
                strokeDasharray={RING} strokeDashoffset={RING * (1 - pct)} />
            </svg>
            <div className="absolute text-center">
              <span className={`block text-2xl font-bold tabular-nums ${urgent ? "text-red-600" : "text-ink"}`}>{left}</span>
              <span className="block text-[10px] uppercase tracking-wide text-muted">sec left</span>
            </div>
          </div>

          <div className="min-w-0">
            <p className="flex items-center gap-1 text-xs uppercase tracking-wide text-muted"><Wallet size={13} aria-hidden="true" /> You earn</p>
            <p className="text-3xl font-bold tabular-nums">{formatTzs(current.payoutTzs)}</p>
            <p className="mt-1 text-xs text-muted">Pickup &amp; drop-off unlock when you accept.</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-[1fr_auto] gap-2">
          <button type="button" disabled={busy} onClick={() => decide(true)}
            className="flex min-h-12 items-center justify-center rounded-full bg-emerald-600 px-4 text-base font-bold text-white transition hover:bg-emerald-700 disabled:opacity-70">
            {busy ? "Accepting…" : "Accept"}
          </button>
          <button type="button" disabled={busy} onClick={() => decide(false)}
            className="flex min-h-12 items-center justify-center rounded-full border border-line px-4 text-base font-semibold text-ink transition hover:bg-subtle disabled:opacity-70">
            Decline
          </button>
        </div>
        {message && <p role="status" aria-live="polite" className="mt-3 text-center text-sm text-red-700">{message}</p>}
      </div>
    </div>
  );
}
