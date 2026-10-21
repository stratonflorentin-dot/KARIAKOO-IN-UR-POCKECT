"use client";

import { useEffect, useMemo, useState } from "react";
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
export function LiveRiderMap({ orderId }: { orderId: string }) {
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
    const timer = window.setInterval(() => void refresh(), 10_000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [client, orderId]);

  if (error) {
    return <p role="status" className="rounded-2xl bg-subtle p-4 text-sm text-muted">{error}</p>;
  }
  if (!position) {
    return <p role="status" className="rounded-2xl bg-subtle p-4 text-sm text-muted">Waiting for your rider&apos;s live location. This map refreshes automatically.</p>;
  }

  const points: MapPoint[] = [
    { id: "rider", kind: "pickup", badge: "R", label: "Your rider", geo: [position.lng, position.lat] },
    ...(dropoff ? [{ id: "dropoff", kind: "dropoff" as const, badge: "D", label: "Delivery destination", geo: [dropoff.lng, dropoff.lat] as [number, number] }] : []),
  ];
  const updated = new Date(position.updated_at);
  const age = Math.max(0, Math.floor((Date.now() - updated.getTime()) / 1000));
  const freshness = age < 5 ? "just now" : age < 60 ? `${age}s ago` : `${Math.floor(age / 60)}m ago`;

  return (
    <section aria-label="Live rider location" className="rounded-3xl border border-line bg-white p-4">
      <h2 className="font-semibold">Live rider location</h2>
      <div className="mt-3">
        <MapLoader
          points={points}
          ariaLabel="Satellite map with the rider and delivery destination"
          route={points.length > 1}
          heightClass="h-64 sm:h-80"
          note="The line is a straight guide between pins, not the road route."
        />
      </div>
      <p className="mt-2 text-xs text-muted">Rider location updated {freshness}. Location is shared only while the delivery is active.</p>
    </section>
  );
}
