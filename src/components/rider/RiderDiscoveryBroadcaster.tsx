"use client";

// Phase 2: while the rider is discoverable (online, approved, not on a delivery)
// their device broadcasts a COARSE, DE-IDENTIFIED position (snapped ~200 m, a
// per-session ephemeral id — never the rider id) on a shared Realtime channel,
// so the customer discovery map can animate it live. Availability is re-checked
// server-side (rider_is_discoverable), so a rider on a trip stops broadcasting.
// Invisible component — mounted in the rider layout.
import { useEffect, useRef } from "react";
import { useAppLocation } from "@/components/location/AppLocationProvider";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export const DISCOVERY_CHANNEL = "riders:discovery";
const BROADCAST_MS = 5000;
const CHECK_MS = 10000;

function snap(n: number): number {
  return Math.round(n / 0.002) * 0.002;
}

export function RiderDiscoveryBroadcaster() {
  const { position, requestLocation } = useAppLocation();
  const posRef = useRef(position);
  posRef.current = position;

  useEffect(() => {
    requestLocation();
    const sb = createSupabaseBrowserClient();
    // De-identified per-session id so the customer map can track a moving marker
    // without ever learning which rider it is.
    const ephemeralId = globalThis.crypto?.randomUUID?.() ?? `r-${Math.random().toString(36).slice(2)}`;
    let discoverable = false;
    let vehicle = "pikipiki";
    let cancelled = false;

    const channel = sb.channel(DISCOVERY_CHANNEL, { config: { broadcast: { ack: false } } });
    channel.subscribe();

    async function check() {
      const { data } = await sb.rpc("rider_is_discoverable");
      const row = Array.isArray(data) ? data[0] : null;
      if (cancelled) return;
      discoverable = Boolean(row?.discoverable);
      if (row?.vehicle) vehicle = String(row.vehicle);
    }
    void check();
    const checkId = window.setInterval(() => void check(), CHECK_MS);

    const sendId = window.setInterval(() => {
      const p = posRef.current;
      if (!discoverable || !p) return;
      void channel.send({
        type: "broadcast",
        event: "pos",
        payload: { id: ephemeralId, v: vehicle, lat: snap(p.lat), lng: snap(p.lng) },
      });
    }, BROADCAST_MS);

    return () => {
      cancelled = true;
      window.clearInterval(checkId);
      window.clearInterval(sendId);
      void sb.removeChannel(channel);
    };
  }, [requestLocation]);

  return null;
}
