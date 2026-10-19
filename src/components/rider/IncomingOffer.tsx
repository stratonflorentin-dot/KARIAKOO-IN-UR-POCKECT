"use client";

// Full-screen job offer with a countdown, like ride-hailing courier apps:
// pickup, drop-off area, distance and earnings, with big Accept / Decline.
// If the rider doesn't answer in time, the offer returns to dispatch.
// Demo preview: decisions stay on this phone until dispatch is live (Phase 6).
import { Clock, MapPin, Store } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { acceptOffer, declineOffer } from "@/app/rider/actions";
import { formatTzs } from "@/lib/format";
import { secondsLeft } from "@/lib/rider-earnings";
import { useAvailability } from "@/lib/rider-store";

export interface OfferView {
  orderId: string;
  reference: string;
  shops: string[];
  dropoffArea: string;
  distance: string;
  payoutTzs: number;
}

export const OFFER_SECONDS = 30;

export function IncomingOffer({ offers, queued = false, live = false }: { offers: OfferView[]; queued?: boolean; live?: boolean }) {
  const router = useRouter();
  const { availability } = useAvailability();
  const [handled, setHandled] = useState<string[]>([]);
  const [note, setNote] = useState("");

  const offer = availability === "online" ? offers.find((o) => !handled.includes(o.orderId)) : undefined;
  const done = (o: OfferView, message?: string) => {
    setHandled((h) => [...h, o.orderId]);
    if (message) setNote(message);
  };

  const onAccept = async (o: OfferView) => {
    // Live: the server decides (it may already be taken). Demo: straight through.
    if (live) {
      const result = await acceptOffer(o.orderId);
      if (!result.ok) return done(o, result.message);
      done(o);
      router.push(`/rider/jobs/${o.orderId}`);
      router.refresh();
      return;
    }
    done(o);
    router.push(`/rider/jobs/${o.orderId}?accepted=1`);
  };

  const onDecline = async (o: OfferView) => {
    if (live) {
      const result = await declineOffer(o.orderId);
      done(o, result.ok ? `Declined ${o.reference}. It goes back to dispatch.` : result.message);
      router.refresh();
      return;
    }
    done(o, `Declined ${o.reference}. It goes back to dispatch (demo: not saved).`);
  };

  return (
    <>
      <p role="status" aria-live="polite" className="empty:hidden rounded-2xl bg-white p-3 text-sm text-muted">{note}</p>
      {offer && (
        // key: a fresh card (and a fresh countdown) for every offer.
        <OfferCard
          key={offer.orderId}
          offer={offer}
          queued={queued}
          onAccept={() => onAccept(offer)}
          onDecline={() => onDecline(offer)}
          onExpire={() => done(offer, `Offer ${offer.reference} expired and went back to dispatch.`)}
        />
      )}
    </>
  );
}

function OfferCard({ offer, queued, onAccept, onDecline, onExpire }: {
  offer: OfferView;
  queued: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onExpire: () => void;
}) {
  const [expiresAt] = useState(() => Date.now() + OFFER_SECONDS * 1000);
  const [now, setNow] = useState(() => expiresAt - OFFER_SECONDS * 1000);
  const accept = useRef<HTMLButtonElement>(null);
  const expire = useRef(onExpire);

  useEffect(() => {
    expire.current = onExpire;
  }, [onExpire]);

  // Buzz, focus Accept, and tick the countdown; time's up → back to dispatch.
  useEffect(() => {
    accept.current?.focus();
    navigator.vibrate?.([200, 100, 200]);
    const tick = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= expiresAt) {
        clearInterval(tick);
        expire.current();
      }
    }, 250);
    return () => clearInterval(tick);
  }, [expiresAt]);

  const left = secondsLeft(expiresAt, now);

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/60 p-3 sm:items-center sm:justify-center">
      <div role="alertdialog" aria-modal="true" aria-labelledby="offer-title" aria-describedby="offer-body" className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <p id="offer-title" className="text-lg font-bold">New delivery request</p>
            {queued && <p className="text-xs font-semibold text-brand-700">Next job, after your current delivery</p>}
          </div>
          <span className="flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1 text-sm font-bold tabular-nums text-brand-800" aria-label={`${left} seconds left`}>
            <Clock size={14} aria-hidden="true" /> {left}s
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-100" aria-hidden="true">
          <div className="h-full bg-brand-600 transition-[width] duration-200" style={{ width: `${(left / OFFER_SECONDS) * 100}%` }} />
        </div>

        <div id="offer-body" className="mt-4 space-y-2">
          <p className="text-4xl font-extrabold tracking-tight">{formatTzs(offer.payoutTzs)}</p>
          <p className="text-sm text-muted">{offer.reference} · about {offer.distance} in total</p>
          <p className="flex items-start gap-2"><Store size={18} className="mt-0.5 shrink-0 text-brand-600" aria-hidden="true" /> Pick up: {offer.shops.join(" + ")}</p>
          <p className="flex items-start gap-2"><MapPin size={18} className="mt-0.5 shrink-0 text-brand-600" aria-hidden="true" /> Deliver to: {offer.dropoffArea}</p>
        </div>

        <div className="mt-5 grid grid-cols-[1fr_2fr] gap-2">
          <button type="button" onClick={onDecline} className="h-14 rounded-2xl border-2 border-line text-base font-semibold">
            Decline
          </button>
          <button ref={accept} type="button" onClick={onAccept} className="h-14 rounded-2xl bg-emerald-600 text-base font-bold text-white">
            Accept
          </button>
        </div>
        <p className="mt-3 text-center text-xs text-muted">Demo: your answer stays on this phone until dispatch is live.</p>
      </div>
    </div>
  );
}
