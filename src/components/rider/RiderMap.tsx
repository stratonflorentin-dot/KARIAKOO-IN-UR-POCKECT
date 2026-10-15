"use client";

// Bolt-style delivery map for riders, built on MapLibre GL (approach adapted
// from the my-view project): numbered pickup pins, a drop-off pin, a guide
// line between stops, and an opt-in "my location" dot.
//
// Privacy: the rider's position is read only after they tap "Share my
// location", only while this screen is open, and it stays on the phone;
// nothing is sent to KARIAKOO in this phase.
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { LocateFixed, LocateOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";

// Turbopack can't resolve MapLibre's bundled worker URL, so load the copy
// placed in /public by scripts/copy-maplibre-worker.mjs.
maplibregl.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

type LngLat = [number, number];
export interface MapStop {
  kind: "pickup" | "dropoff";
  label: string;
  geo: LngLat;
}

const TILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_API_KEY ?? "";

// Keyless CARTO street tiles by default (fine for development; check CARTO's
// terms before commercial use), MapTiler when a key is configured.
function tileSource(): maplibregl.RasterSourceSpecification {
  if (TILER_KEY) {
    return {
      type: "raster",
      tiles: [`https://api.maptiler.com/maps/streets-v2/256/{z}/{x}/{y}.png?key=${TILER_KEY}`],
      tileSize: 256,
      attribution: '© <a href="https://www.maptiler.com/copyright/">MapTiler</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
    };
  }
  return {
    type: "raster",
    tiles: ["a", "b", "c", "d"].map((s) => `https://${s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png`),
    tileSize: 256,
    maxzoom: 19,
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a> © <a href="https://carto.com/attributions">CARTO</a>',
  };
}

/** Great-circle distance in metres. */
export function haversine(a: LngLat, b: LngLat): number {
  const R = 6_371_000;
  const dLat = ((b[1] - a[1]) * Math.PI) / 180;
  const dLng = ((b[0] - a[0]) * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((a[1] * Math.PI) / 180) * Math.cos((b[1] * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

const fmtDist = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`);

function pin(kind: MapStop["kind"], text: string): HTMLElement {
  const el = document.createElement("div");
  el.textContent = text;
  el.setAttribute("aria-hidden", "true");
  el.style.cssText = [
    "display:grid;place-items:center;width:34px;height:34px;border-radius:9999px",
    "font:700 14px system-ui;color:#fff;border:3px solid #fff;box-shadow:0 4px 12px rgba(0,0,0,.35)",
    kind === "pickup" ? "background:#ea580c" : "background:#14110f",
  ].join(";");
  return el;
}

function meDot(): HTMLElement {
  const el = document.createElement("div");
  el.setAttribute("aria-hidden", "true");
  el.style.cssText = "width:18px;height:18px;border-radius:9999px;background:#2563eb;border:3px solid #fff;box-shadow:0 0 0 8px rgba(37,99,235,.25)";
  return el;
}

export default function RiderMap({ stops, nextStopIndex }: { stops: MapStop[]; nextStopIndex: number }) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const meMarker = useRef<maplibregl.Marker | null>(null);
  const watchId = useRef<number | null>(null);
  const [me, setMe] = useState<LngLat | null>(null);
  const [geoError, setGeoError] = useState("");

  useEffect(() => {
    if (!container.current || stops.length === 0) return;
    const map = new maplibregl.Map({
      container: container.current,
      style: { version: 8, sources: { streets: tileSource() }, layers: [{ id: "streets", type: "raster", source: "streets" }] },
      center: stops[0].geo,
      zoom: 13,
      attributionControl: { compact: true },
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    let pickupNo = 0;
    for (const stop of stops) {
      const text = stop.kind === "pickup" ? String(++pickupNo) : "🏁";
      new maplibregl.Marker({ element: pin(stop.kind, text) })
        .setLngLat(stop.geo)
        .setPopup(new maplibregl.Popup({ offset: 20, closeButton: false }).setText(stop.label))
        .addTo(map);
    }

    map.on("load", () => {
      // Straight guide line between stops (not a road route).
      map.addSource("guide", {
        type: "geojson",
        data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: stops.map((s) => s.geo) } },
      });
      map.addLayer({
        id: "guide",
        type: "line",
        source: "guide",
        paint: { "line-color": "#ea580c", "line-width": 3, "line-dasharray": [2, 1.5], "line-opacity": 0.85 },
      });
      const bounds = new maplibregl.LngLatBounds(stops[0].geo, stops[0].geo);
      stops.forEach((s) => bounds.extend(s.geo));
      map.fitBounds(bounds, { padding: 56, maxZoom: 16, duration: 0 });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [stops]);

  // Stop watching location when leaving the screen.
  useEffect(() => () => {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
  }, []);

  const startSharing = () => {
    if (!("geolocation" in navigator)) {
      setGeoError("This phone or browser does not support location.");
      return;
    }
    setGeoError("");
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const here: LngLat = [pos.coords.longitude, pos.coords.latitude];
        setMe(here);
        if (!mapRef.current) return;
        if (!meMarker.current) meMarker.current = new maplibregl.Marker({ element: meDot() }).setLngLat(here).addTo(mapRef.current);
        else meMarker.current.setLngLat(here);
      },
      (err) => setGeoError(err.code === err.PERMISSION_DENIED ? "Location permission was denied." : "Could not get your location."),
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 20_000 },
    );
  };

  const stopSharing = () => {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
    meMarker.current?.remove();
    meMarker.current = null;
    setMe(null);
  };

  const next = stops[nextStopIndex];
  return (
    <div className="overflow-hidden rounded-3xl bg-white">
      <div ref={container} role="region" aria-label="Delivery map showing pickup and drop-off points" className="h-72 w-full sm:h-80" />
      <div className="flex flex-wrap items-center justify-between gap-2 p-3">
        <p className="text-sm">
          {next ? (
            <>
              Next: <strong>{next.label}</strong>
              {me && <> · {fmtDist(haversine(me, next.geo))} away</>}
            </>
          ) : (
            "All stops complete"
          )}
        </p>
        {me ? (
          <button type="button" onClick={stopSharing} className="inline-flex h-11 items-center gap-1.5 rounded-full border border-line px-4 text-sm font-semibold">
            <LocateOff size={16} aria-hidden="true" /> Stop sharing
          </button>
        ) : (
          <button type="button" onClick={startSharing} className="inline-flex h-11 items-center gap-1.5 rounded-full bg-sky-700 px-4 text-sm font-semibold text-white">
            <LocateFixed size={16} aria-hidden="true" /> Share my location
          </button>
        )}
      </div>
      <p className="px-3 pb-3 text-xs text-muted">
        {geoError || "Demo locations are approximate. The dashed line is a guide, not a road route: use Navigate for directions. Your location stays on this phone."}
      </p>
    </div>
  );
}
