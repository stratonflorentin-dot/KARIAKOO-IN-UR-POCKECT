"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, Navigation } from "lucide-react";
import { MapLoader } from "@/components/map/MapLoader";
import type { MapPoint } from "@/components/map/MarketMap";

type Stop = { id: string; label: string; address: string; geo?: [number, number] };

/** Opens a rider's route inside KARIAKOO and uses their live device position as the origin. */
export function RiderStopNavigation({ stop, kind }: { stop: Stop; kind: "pickup" | "dropoff" }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [locationError, setLocationError] = useState("");
  const watchId = useRef<number | null>(null);
  const point: MapPoint = {
    id: stop.id,
    kind,
    badge: kind === "pickup" ? "P" : "D",
    label: stop.label,
    geo: stop.geo!,
  };

  useEffect(() => () => {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
  }, []);

  if (!stop.geo) {
    return <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-800"><MapPin size={14} aria-hidden="true" /> {kind === "dropoff" ? "Exact customer map pin unavailable. Ask the customer to add one or contact support." : "This shop has no saved map pin. Ask the seller to save its pickup location in the Seller dashboard."}</p>;
  }

  function toggleNavigation() {
    if (open) {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
      setPosition(null);
      setOpen(false);
      return;
    }
    setOpen(true);
    setLocationError("");
    if (!navigator.geolocation) {
      setLocationError("This browser does not support location access.");
      return;
    }
    watchId.current = navigator.geolocation.watchPosition(
      ({ coords }) => setPosition([coords.longitude, coords.latitude]),
      (error) => setLocationError(error.code === error.PERMISSION_DENIED ? "Allow location access to show a route from your position." : "Could not get your location. Check that location is enabled."),
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 20_000 },
    );
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={toggleNavigation}
        aria-expanded={open}
        className="inline-flex h-11 items-center gap-1.5 rounded-full bg-night px-4 text-sm font-semibold text-white"
      >
        <Navigation size={16} aria-hidden="true" /> {open ? "Hide map" : "Navigate"}
      </button>
      {open && (
        <div className="mt-3">
          <MapLoader
            points={[point]}
            ariaLabel={`In-app route from your current position to ${stop.label}`}
            routeFromMe
            deviceLocation={position}
            heightClass="h-72 sm:h-80"
            note="Blue dot: your current position. Blue line: straight-line guide to this stop, not turn-by-turn road directions."
          />
          {locationError && <p role="status" className="mt-2 text-sm text-amber-800">{locationError}</p>}
        </div>
      )}
    </div>
  );
}
