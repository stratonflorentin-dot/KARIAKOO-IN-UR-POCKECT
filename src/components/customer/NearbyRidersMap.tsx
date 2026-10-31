"use client";

// "Riders near you" discovery map for the pre-order customer. Live rider movement
// arrives over a Supabase Realtime Broadcast channel (de-identified, approximate
// positions); an RPC snapshot (nearby_available_riders) seeds the map and acts as
// a fallback when no one is broadcasting. The precise live location of the rider
// assigned to an order is shown only after booking.
import { useEffect, useMemo, useRef, useState } from "react";
import { MapLoader } from "@/components/map/MapLoader";
import type { MapPoint } from "@/components/map/MarketMap";
import { riderRouteEta } from "@/app/[lang]/customer/transport/actions";
import { DISCOVERY_CHANNEL } from "@/components/rider/RiderDiscoveryBroadcaster";
import { useAppLocation } from "@/components/location/AppLocationProvider";
import { getVehicleById, type GroundTransportVehicleId } from "@/lib/parcel-transport";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type VehId = GroundTransportVehicleId;

interface Rider {
  id: string;
  vehicle: VehId;
  lat: number;
  lng: number;
  distanceM: number;
}
interface LivePing {
  v: VehId;
  lat: number;
  lng: number;
  lastSeen: number;
}

const FILTERS: { id: VehId | "all"; label: string }[] = [
  { id: "all", label: "Zote" },
  { id: "pikipiki", label: "Pikipiki" },
  { id: "bajaji", label: "Bajaji" },
  { id: "pickup", label: "Pickup" },
  { id: "lori_dogo", label: "Lori" },
];

const AVG_SPEED_KMH = 20; // rough until route-based ETA (Phase 3)
const STALE_MS = 15_000;
function approxMinutes(distanceM: number): number {
  return Math.max(1, Math.round((distanceM / 1000 / AVG_SPEED_KMH) * 60));
}
function haversineM(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6_371_000;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function NearbyRidersMap({ radiusM = 5000 }: { radiusM?: number }) {
  const { position, requestLocation } = useAppLocation();
  const client = useMemo(() => createSupabaseBrowserClient(), []);
  const [filter, setFilter] = useState<VehId | "all">("all");
  const [snapshot, setSnapshot] = useState<Rider[]>([]);
  const [live, setLive] = useState<Record<string, LivePing>>({});
  const [error, setError] = useState("");
  const [eta, setEta] = useState<{ minutes: number; approximate: boolean } | null>(null);
  const posRef = useRef(position);
  posRef.current = position;
  const nearestRef = useRef<Rider | undefined>(undefined);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  // RPC snapshot (seed + fallback), refreshed every 12s.
  useEffect(() => {
    if (!position) return;
    let alive = true;
    async function refresh() {
      const { data, error: rpcError } = await client.rpc("nearby_available_riders", {
        p_lat: position!.lat,
        p_lng: position!.lng,
        p_radius_m: radiusM,
        p_vehicle: null,
      });
      if (!alive) return;
      if (rpcError) {
        setError("Imeshindikana kupata madereva walio karibu.");
        return;
      }
      setError("");
      setSnapshot(
        ((data ?? []) as { vehicle: VehId; approx_lat: number; approx_lng: number; distance_m: number }[]).map((r, i) => ({
          id: `snap-${i}`,
          vehicle: r.vehicle,
          lat: r.approx_lat,
          lng: r.approx_lng,
          distanceM: r.distance_m,
        })),
      );
    }
    void refresh();
    const id = window.setInterval(() => void refresh(), 12_000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [client, position, radiusM]);

  // Live movement over the broadcast channel.
  useEffect(() => {
    const channel = client.channel(DISCOVERY_CHANNEL, { config: { broadcast: { ack: false } } });
    channel.on("broadcast", { event: "pos" }, ({ payload }) => {
      const p = payload as { id?: string; v?: VehId; lat?: number; lng?: number };
      if (!p?.id || typeof p.lat !== "number" || typeof p.lng !== "number") return;
      setLive((prev) => ({ ...prev, [p.id!]: { v: (p.v ?? "pikipiki") as VehId, lat: p.lat!, lng: p.lng!, lastSeen: Date.now() } }));
    });
    channel.subscribe();
    // Drop riders we haven't heard from recently so a stale marker never looks live.
    const prune = window.setInterval(() => {
      const cutoff = Date.now() - STALE_MS;
      setLive((prev) => {
        const next: Record<string, LivePing> = {};
        let changed = false;
        for (const [k, v] of Object.entries(prev)) {
          if (v.lastSeen >= cutoff) next[k] = v;
          else changed = true;
        }
        return changed ? next : prev;
      });
    }, 4_000);
    return () => {
      window.clearInterval(prune);
      void client.removeChannel(channel);
    };
  }, [client]);

  // Prefer live broadcast riders; fall back to the RPC snapshot when none are live.
  const liveRiders: Rider[] = position
    ? Object.entries(live).map(([id, v]) => ({
        id,
        vehicle: v.v,
        lat: v.lat,
        lng: v.lng,
        distanceM: Math.round(haversineM(position.lat, position.lng, v.lat, v.lng)),
      }))
    : [];
  const source = liveRiders.length > 0 ? liveRiders : snapshot;
  const riders = (filter === "all" ? source : source.filter((r) => r.vehicle === filter))
    .filter((r) => r.distanceM <= radiusM)
    .sort((a, b) => a.distanceM - b.distanceM);

  const points: MapPoint[] = riders.map((r) => {
    const veh = getVehicleById(r.vehicle);
    return {
      id: r.id,
      kind: "rider" as const,
      badge: `${approxMinutes(r.distanceM)} min`,
      label: `${veh.name} · ~${(r.distanceM / 1000).toFixed(1)} km`,
      geo: [r.lng, r.lat] as [number, number],
      vehicleType: r.vehicle,
      vehicleImageUrl: veh.imageUrl,
    };
  });
  const nearest = riders[0];
  nearestRef.current = nearest;

  // Road-based ETA for the nearest rider, refreshed on a new nearest rider and
  // every 30s (bounded so we respect the routing API's free-tier limits).
  useEffect(() => {
    if (!nearestRef.current) {
      setEta(null);
      return;
    }
    let alive = true;
    async function fetchEta() {
      const p = posRef.current;
      const n = nearestRef.current;
      if (!p || !n) return;
      const r = await riderRouteEta(n.lat, n.lng, p.lat, p.lng);
      if (alive) setEta({ minutes: Math.max(1, Math.round(r.durationS / 60)), approximate: r.approximate });
    }
    void fetchEta();
    const id = window.setInterval(() => void fetchEta(), 30_000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [nearest?.id]);

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
            {nearest && (
              <span className="text-muted">
                Aliye karibu zaidi ~{eta ? eta.minutes : approxMinutes(nearest.distanceM)} dakika{" "}
                {eta && !eta.approximate ? "(njia)" : "(makisio)"}
              </span>
            )}
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
