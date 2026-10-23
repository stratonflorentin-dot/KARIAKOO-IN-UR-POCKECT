"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bike, MapPin, Navigation } from "lucide-react";
import { claimDelivery } from "@/app/[lang]/rider/actions";
import { useI18n } from "@/i18n/client";
import { localizePath } from "@/i18n/config";
import { formatDateTime, formatTzs } from "@/lib/format";
import type { RiderAvailableDelivery } from "@/lib/data/rider-live";

export function AvailableDeliveries({ deliveries, unavailable = false }: { deliveries: RiderAvailableDelivery[]; unavailable?: boolean }) {
  const router = useRouter();
  const { locale } = useI18n();
  const [claiming, setClaiming] = useState("");
  const [error, setError] = useState("");

  async function claim(orderId: string) {
    setClaiming(orderId);
    setError("");
    const result = await claimDelivery(orderId);
    if (!result.ok) {
      setError(result.message);
      setClaiming("");
      router.refresh();
      return;
    }
    router.push(localizePath(locale, `/rider/jobs/${orderId}`));
    router.refresh();
  }

  return (
    <section aria-labelledby="available-deliveries" className="mt-6">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="available-deliveries" className="text-lg font-semibold">Available deliveries</h2>
          <p className="text-sm text-muted">Open jobs for online riders, sorted by nearest pickup.</p>
        </div>
        <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-800">{deliveries.length} open</span>
      </div>
      {error && <p role="alert" className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
      {unavailable && <p role="status" className="mb-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">The delivery board is temporarily unavailable while dispatch is being updated. Your current deliveries are still available below. Refresh this page shortly.</p>}
      {deliveries.length === 0 && !unavailable ? (
        <div className="rounded-2xl border border-dashed border-line bg-white p-5 text-sm text-muted">
          No open deliveries right now. Keep the app online; new jobs will appear here automatically.
        </div>
      ) : deliveries.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {deliveries.map((delivery) => (
            <li key={delivery.orderId}>
              <article className="flex h-full flex-col rounded-2xl border border-line bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">{delivery.reference}</p>
                    <p className="mt-1 text-xs text-muted">Placed {formatDateTime(delivery.placedAt)}</p>
                  </div>
                  <p className="shrink-0 font-bold tabular-nums text-brand-800">{formatTzs(delivery.payoutTzs)}</p>
                </div>
                <div className="mt-4 flex items-start gap-2 text-sm">
                  <MapPin size={17} className="mt-0.5 shrink-0 text-brand-700" aria-hidden="true" />
                  <div className="min-w-0"><p className="text-xs uppercase tracking-wide text-muted">Pickup</p><p className="truncate font-medium">{delivery.pickupNames}</p></div>
                </div>
                <p className="mt-3 flex items-center gap-2 text-xs text-muted">
                  <Navigation size={14} aria-hidden="true" />
                  {delivery.distanceKm === null ? "Distance unavailable" : `About ${delivery.distanceKm.toFixed(1)} km away`}
                </p>
                <button type="button" disabled={!delivery.canClaim || claiming !== ""} onClick={() => claim(delivery.orderId)}
                  className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-brand-700 px-4 font-semibold text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:bg-stone-300">
                  <Bike size={17} aria-hidden="true" />
                  {claiming === delivery.orderId ? "Claiming…" : delivery.canClaim ? "Accept delivery" : "Finish current delivery first"}
                </button>
                {!delivery.canClaim && <p className="mt-2 text-center text-xs text-muted">You can browse jobs while busy, but may only handle one at a time.</p>}
              </article>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
