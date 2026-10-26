"use client";

import { useEffect, useMemo, useState } from "react";
import { ShieldCheck, Clock } from "lucide-react";
import { MapLoader } from "@/components/map/MapLoader";
import type { MapPoint } from "@/components/map/MarketMap";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type RiderPosition = {
  lat: number;
  lng: number;
  updated_at: string;
};

type DropoffPosition = { lat: number; lng: number };

/** Customer-only live view; the RPC checks order ownership and rider freshness. */
export function LiveRiderMap({ orderId, riderName }: { orderId: string; riderName?: string }) {
  const client = useMemo(() => createSupabaseBrowserClient(), []);
  const [position, setPosition] = useState<RiderPosition | null>(null);
  const [dropoff, setDropoff] = useState<DropoffPosition | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      const [{ data, error: riderError }, { data: pin, error: pinError }] = await Promise.all([
        client.rpc("customer_get_order_rider_location", { p_order_id: orderId }),
        client.from("order_dropoff_locations").select("lat,lng").eq("order_id", orderId).maybeSingle(),
      ]);
      if (!alive) return;
      if (riderError) {
        setError("Live rider location is unavailable right now.");
        return;
      }
      setError("");
      const row = Array.isArray(data) ? data[0] : null;
      setPosition((current) => row && current &&
        current.lat === Number(row.lat) &&
        current.lng === Number(row.lng) &&
        current.updated_at === row.updated_at
          ? current
          : row
            ? { lat: Number(row.lat), lng: Number(row.lng), updated_at: row.updated_at }
            : null);
      setDropoff(!pinError && pin ? { lat: Number(pin.lat), lng: Number(pin.lng) } : null);
    };

    void refresh();
    // Fast 5-second polling for live real-time safety tracking
    const timer = window.setInterval(() => void refresh(), 5_000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [client, orderId]);

  if (error) {
    return <p role="status" className="rounded-2xl bg-subtle p-4 text-sm text-muted">{error}</p>;
  }
  if (!position) {
    return (
      <div className="rounded-3xl border border-line bg-white p-5 space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800">
          <ShieldCheck size={16} className="text-emerald-600 animate-pulse" />
          <span>Ulinzi wa Safari (User Safety Tracking)</span>
        </div>
        <p className="text-xs text-muted">
          Dereva akichukua mzigo, eneo lake la GPS litatokea hapa moja kwa moja kwa ajili ya usalama wako.
        </p>
      </div>
    );
  }

  const points: MapPoint[] = [
    {
      id: "rider",
      kind: "rider",
      badge: "Dereva Yuko Njiani",
      label: riderName ? `Dereva: ${riderName}` : "Dereva wa Mzigo",
      geo: [position.lng, position.lat],
    },
    ...(dropoff
      ? [
          {
            id: "dropoff",
            kind: "dropoff" as const,
            badge: "Dropoff",
            label: "Eneo la Kushusha Mzigo",
            geo: [dropoff.lng, dropoff.lat] as [number, number],
          },
        ]
      : []),
  ];

  const updated = new Date(position.updated_at);
  const age = Math.max(0, Math.floor((Date.now() - updated.getTime()) / 1000));
  const freshness = age < 5 ? "sasa hivi" : age < 60 ? `sekunde ${age} zilizopita` : `dakika ${Math.floor(age / 60)} zilizopita`;

  return (
    <section aria-label="Live rider location" className="rounded-3xl border border-line bg-white p-4 shadow-xs">
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-line">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-100 text-emerald-800">
            <ShieldCheck size={18} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-ink">
              {riderName ? `Safari ya ${riderName}` : "Ufuatiliaji wa Dereva Moja kwa Moja"}
            </h2>
            <p className="text-3xs text-muted">Ulinzi wa Safari unafanya kazi · GPS inajihuisha {freshness}</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-2xs font-bold text-emerald-800 border border-emerald-200">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-ping" />
          Live GPS
        </span>
      </div>

      <div className="mt-3 overflow-hidden rounded-2xl border border-line">
        <MapLoader
          points={points}
          ariaLabel="Ramani inayoonyesha dereva na eneo la kushusha mzigo"
          route={points.length > 1}
          defaultView="streets"
          showLocateButton={true}
          heightClass="h-72 sm:h-80"
          note="Eneo la dereva linashirikiwa moja kwa moja kwa ajili ya usalama wa mzigo."
        />
      </div>

      <div className="mt-2.5 flex items-center justify-between text-2xs text-muted">
        <div className="flex items-center gap-1.5">
          <Clock size={12} className="text-emerald-700" />
          <span>Inajihuisha kila sekunde 5</span>
        </div>
        <span>Usalama: Eneo linashirikiwa nawe pekee</span>
      </div>
    </section>
  );
}
