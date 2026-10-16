"use client";

// Shared KARIAKOO map, built on MapLibre GL (setup adapted from the my-view
// project). Used by riders (delivery route), customers (shops, order route)
// and shop owners (their shop location).
//
// Privacy: the viewer's own position is read only after they tap "Share my
// location", only while the map is open, and it never leaves the device.
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Layers, LocateFixed, LocateOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";

// Turbopack can't resolve MapLibre's bundled worker URL, so load the copy
// placed in /public by scripts/copy-maplibre-worker.mjs.
maplibregl.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

export type LngLat = [number, number];

export interface MapPoint {
  id: string;
  kind: "shop" | "pickup" | "dropoff";
  label: string;
  geo: LngLat;
  /** Short text on the pin (e.g. a number or initial). */
  badge?: string;
  /** Optional in-app link shown in the pop-up. */
  href?: string;
  linkLabel?: string;
}

const TILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_API_KEY ?? "";

// Satellite imagery (default view), as in my-view: keyless Esri World Imagery
// plus a transparent labels layer, or MapTiler satellite when a key is set.
// Both keyless sources are for development; a commercial launch needs a
// licensed imagery plan (MapTiler or Esri).
function satelliteSource(): maplibregl.RasterSourceSpecification {
  if (TILER_KEY) {
    return {
      type: "raster",
      tiles: [`https://api.maptiler.com/tiles/satellite-v2/{z}/{x}/{y}.jpg?key=${TILER_KEY}`],
      tileSize: 256,
      maxzoom: 20,
      attribution: '© <a href="https://www.maptiler.com/copyright/">MapTiler</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
    };
  }
  return {
    type: "raster",
    tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
    tileSize: 256,
    // Real captures end around here; deeper zoom just enlarges the last tile.
    maxzoom: 18,
    attribution: "Imagery © Esri, Maxar, Earthstar Geographics",
  };
}

function labelsSource(): maplibregl.RasterSourceSpecification {
  return {
    type: "raster",
    tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"],
    tileSize: 256,
    maxzoom: 18,
  };
}

// Street map: keyless CARTO tiles by default, MapTiler when a key is set.
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

export const fmtDist = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`);

const pinColor: Record<MapPoint["kind"], string> = { shop: "#ea580c", pickup: "#ea580c", dropoff: "#14110f" };

function pinElement(point: MapPoint): HTMLElement {
  const el = document.createElement("div");
  el.textContent = point.badge ?? (point.kind === "dropoff" ? "🏁" : "");
  el.setAttribute("aria-hidden", "true");
  el.style.cssText = [
    "display:grid;place-items:center;width:32px;height:32px;border-radius:9999px;cursor:pointer",
    "font:700 13px system-ui;color:#fff;border:3px solid #fff;box-shadow:0 4px 12px rgba(0,0,0,.35)",
    `background:${pinColor[point.kind]}`,
  ].join(";");
  return el;
}

/** Pop-up content built with DOM APIs (never innerHTML), so names can't inject markup. */
function popupContent(point: MapPoint): HTMLElement {
  const box = document.createElement("div");
  box.style.cssText = "font:500 13px system-ui;color:#0c0a09;max-width:200px";
  const title = document.createElement("p");
  title.textContent = point.label;
  title.style.margin = "0";
  box.appendChild(title);
  if (point.href && point.href.startsWith("/")) {
    const a = document.createElement("a");
    a.href = point.href;
    a.textContent = point.linkLabel ?? "Open";
    a.style.cssText = "display:inline-block;margin-top:4px;color:#c2410c;font-weight:700";
    box.appendChild(a);
  }
  return box;
}

function meDot(): HTMLElement {
  const el = document.createElement("div");
  el.setAttribute("aria-hidden", "true");
  el.style.cssText = "width:18px;height:18px;border-radius:9999px;background:#2563eb;border:3px solid #fff;box-shadow:0 0 0 8px rgba(37,99,235,.25)";
  return el;
}

export default function MarketMap({
  points,
  ariaLabel,
  route = false,
  locate = false,
  nextIndex,
  heightClass = "h-72 sm:h-80",
  note,
  heat = [],
}: {
  points: MapPoint[];
  ariaLabel: string;
  /** Draw a dashed guide line through the points in order (not a road route). */
  route?: boolean;
  /** Offer opt-in "Share my location" with distance to the next point. */
  locate?: boolean;
  nextIndex?: number;
  heightClass?: string;
  note?: string;
  /** Shaded circles showing demand; bigger weight = bigger, stronger circle. */
  heat?: { geo: LngLat; weight: number }[];
}) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const meMarker = useRef<maplibregl.Marker | null>(null);
  const watchId = useRef<number | null>(null);
  const [me, setMe] = useState<LngLat | null>(null);
  const [geoError, setGeoError] = useState("");
  const [view, setView] = useState<"satellite" | "streets">("satellite");
  const viewRef = useRef(view);
  const pointsKey = JSON.stringify(points);
  const heatKey = JSON.stringify(heat);

  useEffect(() => {
    const pts: MapPoint[] = JSON.parse(pointsKey);
    if (!container.current || pts.length === 0) return;
    const map = new maplibregl.Map({
      container: container.current,
      style: {
        version: 8,
        sources: { satellite: satelliteSource(), labels: labelsSource(), streets: tileSource() },
        layers: [
          { id: "satellite", type: "raster", source: "satellite", layout: { visibility: viewRef.current === "satellite" ? "visible" : "none" } },
          // MapTiler satellite has no separate labels layer; Esri imagery does.
          { id: "labels", type: "raster", source: "labels", layout: { visibility: viewRef.current === "satellite" && !TILER_KEY ? "visible" : "none" } },
          { id: "streets", type: "raster", source: "streets", layout: { visibility: viewRef.current === "streets" ? "visible" : "none" } },
        ],
      },
      center: pts[0].geo,
      zoom: 15,
      attributionControl: { compact: true },
      cooperativeGestures: true, // one-finger scrolling still scrolls the page on phones
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    for (const p of pts) {
      new maplibregl.Marker({ element: pinElement(p) })
        .setLngLat(p.geo)
        .setPopup(new maplibregl.Popup({ offset: 20, closeButton: false }).setDOMContent(popupContent(p)))
        .addTo(map);
    }

    map.on("load", () => {
      const heatPts: { geo: LngLat; weight: number }[] = JSON.parse(heatKey);
      if (heatPts.length) {
        map.addSource("heat", {
          type: "geojson",
          data: { type: "FeatureCollection", features: heatPts.map((h) => ({ type: "Feature", properties: { w: h.weight }, geometry: { type: "Point", coordinates: h.geo } })) },
        });
        map.addLayer({
          id: "heat",
          type: "circle",
          source: "heat",
          paint: {
            "circle-color": "#f97316",
            "circle-opacity": 0.35,
            "circle-stroke-color": "#ea580c",
            "circle-stroke-width": 2,
            // Grows with demand and with zoom.
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 11, ["*", 10, ["get", "w"]], 16, ["*", 40, ["get", "w"]]],
          },
        });
      }
      if (route && pts.length > 1) {
        map.addSource("guide", { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: pts.map((p) => p.geo) } } });
        map.addLayer({ id: "guide", type: "line", source: "guide", paint: { "line-color": "#ea580c", "line-width": 3, "line-dasharray": [2, 1.5], "line-opacity": 0.85 } });
      }
      if (pts.length > 1) {
        const bounds = new maplibregl.LngLatBounds(pts[0].geo, pts[0].geo);
        pts.forEach((p) => bounds.extend(p.geo));
        map.fitBounds(bounds, { padding: 56, maxZoom: 16, duration: 0 });
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
      meMarker.current = null;
    };
  }, [pointsKey, heatKey, route]);

  // Switch between satellite and street map without rebuilding the map.
  useEffect(() => {
    viewRef.current = view;
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      map.setLayoutProperty("satellite", "visibility", view === "satellite" ? "visible" : "none");
      map.setLayoutProperty("labels", "visibility", view === "satellite" && !TILER_KEY ? "visible" : "none");
      map.setLayoutProperty("streets", "visibility", view === "streets" ? "visible" : "none");
    };
    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);
  }, [view]);

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

  const next = nextIndex !== undefined && nextIndex >= 0 ? points[nextIndex] : undefined;

  return (
    <div className="overflow-hidden rounded-3xl border border-line bg-white">
      <div className="relative">
        <div ref={container} role="region" aria-label={ariaLabel} className={`w-full ${heightClass}`} />
        <button
          type="button"
          onClick={() => setView((v) => (v === "satellite" ? "streets" : "satellite"))}
          aria-pressed={view === "satellite"}
          className="absolute left-2 top-2 z-10 inline-flex h-10 items-center gap-1.5 rounded-full bg-white/95 px-3 text-xs font-semibold text-ink shadow-md hover:bg-white"
        >
          <Layers size={15} aria-hidden="true" />
          {view === "satellite" ? "Map view" : "Satellite view"}
        </button>
      </div>
      {locate && (
        <div className="flex flex-wrap items-center justify-between gap-2 p-3">
          <p className="text-sm">
            {next ? (
              <>Next: <strong>{next.label}</strong>{me && <> · {fmtDist(haversine(me, next.geo))} away</>}</>
            ) : nextIndex !== undefined ? "All stops complete" : me ? "Showing your location" : "Tap to see where you are"}
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
      )}
      <p className="px-3 pb-3 pt-2 text-xs text-muted">
        {geoError || note || "Demo locations are approximate."}
        {locate && !geoError && " Your location stays on this device."}
      </p>
    </div>
  );
}
