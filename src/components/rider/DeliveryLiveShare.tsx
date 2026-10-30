"use client";

// Anti-theft live sharing: while a parcel is in the rider's hands (PICKED_UP /
// IN_TRANSIT), the rider's device position is sent to the server every ~20s. The
// customer and dispatch see the live dot; the server keeps a timestamped trail so
// a missing parcel can be traced. Reuses the app-wide location stream, and stops
// automatically when this component unmounts (status change / leaving the page).
import { Radio } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAppLocation } from "@/components/location/AppLocationProvider";
import { pingDeliveryLocation } from "@/app/[lang]/rider/actions";

const PING_MS = 20_000;

export function DeliveryLiveShare({ orderId }: { orderId: string }) {
  const { position, requestLocation } = useAppLocation();
  const [sharing, setSharing] = useState(false);
  const posRef = useRef(position);
  posRef.current = position;

  // Make sure the device is actively reporting position for this delivery.
  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  useEffect(() => {
    let cancelled = false;
    async function send() {
      const p = posRef.current;
      if (!p) return;
      const res = await pingDeliveryLocation(orderId, p.lng, p.lat, p.accuracy);
      if (!cancelled) setSharing(res.ok);
    }
    void send();
    const id = window.setInterval(() => void send(), PING_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [orderId]);

  const message = sharing
    ? "You're sharing your live location for this delivery. The customer and dispatch can see your route until you confirm the delivery PIN."
    : position
      ? "Starting live location sharing…"
      : "Turn on location to share your live position for this delivery.";

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
      <span className="relative mt-0.5 flex h-2.5 w-2.5 shrink-0" aria-hidden="true">
        {sharing && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />}
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-600" />
      </span>
      <span className="flex items-center gap-1.5">
        <Radio size={15} className="shrink-0" aria-hidden="true" />
        {message}
      </span>
    </div>
  );
}
