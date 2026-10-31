"use client";

// "Riders near you" discovery map for the pre-order customer. Calls the
// nearby_available_riders RPC (de-identified, approximate positions) directly
// from the browser and plots vehicle-type markers on the existing MapLibre map,
// with a vehicle filter. Positions are approximate by design; the precise live
// location of the rider assigned to an order is shown only after booking.
import { useEffect, useMemo, useState } from "react";
import { MapLoader } from "@/components/map/MapLoader";
import type { MapPoint } from "@/components/map/MarketMap";
import { useAppLocation } from "@/components/location/AppLocationProvider";
import { getVehicleById, type GroundTransportVehicleId } from "@/lib/parcel-transport";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface NearbyRider {
  vehicle: GroundTransportVehicleId;
  approx_lat: number;
  approx_lng: number;
  distance_m: number;
}

const FILTERS: { id: GroundTransportVehicleId | "all"; label: string }[] = [
  { id: "all", label: "Zote" },
  { id: "pikipiki", label: "Pikipiki" },
  { id: "bajaji", label: "Bajaji" },
  { id: "pickup", label: "Pickup" },
  { id: "lori_dogo", label: "Lori" },
];

// Rough travel-time estimate until route-based ETA (Phase 3) is wired.
const AVG_SPEED_KMH = 20;
function approxMinutes(distanceM: number): number {
  return Math.max(1, Math.round((distanceM / 1000 / AVG_SPEED_KMH) * 60));
}

export function NearbyRidersMap({ radiusM = 5000 }: { radiusM?: number }) {
  const { position, requestLocation } = useAppLocation();
  const client = useMemo(() => createSupabaseBrowserClient(), []);
  const [filter, setFilter] = useState<GroundTransportVehicleId | "all">("all");
  const [riders, setRiders] = useState<NearbyRider[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  useEffect(() => {
    if (!position) return;
    let alive = true;
    async function refresh() {
      const { data, error: rpcError } = await client.rpc("nearby_available_riders", {
        p_lat: position!.lat,
        p_lng: position!.lng,
        p_radius_m: radiusM,
        p_vehicle: filter === "all" ? null : filter,
      });
      if (!alive) return;
      if (rpcError) {
        setError("Imeshindikana kupata madereva walio karibu.");
        return;
      }
      setError("");
      setRiders((data ?? []) as NearbyRider[]);
    }
    void refresh();
    const id = window.setInterval(() => void refresh(), 12_000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [client, position, filter, radiusM]);

  const points: MapPoint[] = riders.map((r, i) => {
    const v = getVehicleById(r.vehicle);
    return {
      id: `nearby-rider-${i}`,
      kind: "rider" as const,
      badge: `${approxMinutes(r.distance_m)} min`,
      label: `${v.name} · ~${(r.distance_m / 1000).toFixed(1)} km`,
      geo: [r.approx_lng, r.approx_lat] as [number, number],
      vehicleType: r.vehicle,
      vehicleImageUrl: v.imageUrl,
    };
  });
  const nearest = riders[0];

  return (
    <section aria-label="Madereva walio karibu" className="space-y-3">
      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            aria-pressed={filter === f.id}
            className={`inline-flex h-9 shrink-0 items-center rounded-full px-4 text-sm font-semibold transition ${
              filter === f.id ? "bg-brand-600 text-white" : "border border-line bg-white text-ink hover:border-brand-300"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {!position ? (
        <div className="rounded-2xl border border-line bg-white p-5 text-sm text-muted">
          Washa huduma ya eneo (location) ili kuona madereva walio karibu nawe.
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2 rounded-2xl border border-line bg-white px-4 py-3 text-sm">
            <span className="font-semibold">{riders.length} {riders.length === 1 ? "dereva" : "madereva"} karibu</span>
            {nearest && <span className="text-muted">Aliye karibu zaidi ~{approxMinutes(nearest.distance_m)} dakika (makisio)</span>}
          </div>
          <div className="overflow-hidden rounded-2xl border border-line">
            <MapLoader
              points={points}
              ariaLabel="Ramani ya madereva walio karibu"
              showLocateButton
              defaultView="streets"
              heightClass="h-72 sm:h-96"
              note="Nafasi za madereva ni za makisio hadi utakapoagiza; eneo kamili la dereva wako linaonekana baada ya kuagiza."
            />
          </div>
          {error && <p role="status" aria-live="polite" className="text-xs text-red-700">{error}</p>}
        </>
      )}
    </section>
  );
}
