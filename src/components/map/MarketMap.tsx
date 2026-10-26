"use client";

// Shared KARIAKOO map, built on MapLibre GL (setup adapted from the my-view
// project). Used by riders (delivery route), customers (shops, order route)
// and shop owners (their shop location).
//
// Privacy: the viewer's own position is read only after they tap "Share my
// location", only while the map is open, and it never leaves the device.
import * as maplibregl from "maplibre-gl";
import { Crosshair, Layers, LocateFixed, LocateOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";

// Turbopack can't resolve MapLibre's bundled worker URL, so load the copy
// placed in /public by scripts/copy-maplibre-worker.mjs.
maplibregl.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

export type LngLat = [number, number];

export interface MapPoint {
  id: string;
  kind: "shop" | "pickup" | "dropoff" | "rider";
  label: string;
  geo: LngLat;
  /** Short text on the pin (e.g. a number or initial). */
  badge?: string;
  /** Optional in-app link shown in the pop-up. */
  href?: string;
  linkLabel?: string;
  /** Optional vehicle category for rider avatar: pikipiki, bajaji, pickup, lori_dogo */
  vehicleType?: "pikipiki" | "bajaji" | "pickup" | "lori_dogo" | string;
  /** Optional image URL for vehicle avatar */
  vehicleImageUrl?: string;
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

const pinColor: Record<MapPoint["kind"], string> = { shop: "#059669", pickup: "#059669", dropoff: "#0a211a", rider: "#0f172a" };

function pinElement(point: MapPoint): HTMLElement {
  if (point.kind === "rider") {
    const container = document.createElement("div");
    container.setAttribute("aria-label", `Rider: ${point.label}`);
    container.style.cssText = [
      "display:flex",
      "flex-direction:column",
      "align-items:center",
      "cursor:pointer",
      "user-select:none",
      "transform:translate(0, -10px)",
    ].join(";");

    const vType = (point.vehicleType || "").toLowerCase();
    const isBajaj = vType.includes("bajaj") || vType.includes("tri");
    const isPickup = vType.includes("pickup") || vType.includes("car");
    const isLori = vType.includes("lori") || vType.includes("truck") || vType.includes("canter");

    // Pill badge above the vehicle
    const badge = document.createElement("div");
    let defaultBadge = "🏍️ Dereva Yuko Njiani";
    if (isBajaj) defaultBadge = "🛺 Bajaji Iko Njiani";
    else if (isPickup) defaultBadge = "🛻 Pickup Iko Njiani";
    else if (isLori) defaultBadge = "🚚 Lori Dogo Liko Njiani";

    badge.textContent = point.badge || defaultBadge;
    badge.style.cssText = [
      "background:#047857",
      "color:#ffffff",
      "font:800 11px/1.2 system-ui, -apple-system, sans-serif",
      "padding:4px 10px",
      "border-radius:9999px",
      "box-shadow:0 3px 10px rgba(0,0,0,0.35)",
      "margin-bottom:4px",
      "white-space:nowrap",
      "letter-spacing:0.02em",
      "border:1.5px solid #ffffff",
    ].join(";");
    container.appendChild(badge);

    // Vehicle avatar disc with pulse radar safety ring
    const vehicleDisc = document.createElement("div");
    vehicleDisc.style.cssText = [
      "display:grid",
      "place-items:center",
      "width:44px",
      "height:44px",
      "border-radius:9999px",
      "background:#ffffff",
      "border:2.5px solid #059669",
      "box-shadow:0 0 0 6px rgba(16,185,129,0.32), 0 4px 14px rgba(0,0,0,0.38)",
      "overflow:hidden",
      "position:relative",
      "padding:2px",
    ].join(";");

    const imgSrc =
      point.vehicleImageUrl ||
      (isBajaj
        ? "/images/transport/bajaji.png"
        : isPickup
          ? "/images/transport/pickup.png"
          : isLori
            ? "/images/transport/lori_dogo.png"
            : "/images/transport/pikipiki.png");

    let fallbackSvg = "";
    if (isBajaj) {
      fallbackSvg = `<svg style="display:none;width:24px;height:24px" viewBox="0 0 24 24" fill="none" stroke="#047857" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="4" cy="19" r="2.5"/><circle cx="20" cy="19" r="2.5"/><path d="M3 16V9a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v7H3z" fill="#10b981"/><path d="M14 6l3 5H14V6z" fill="#38bdf8"/></svg>`;
    } else if (isPickup) {
      fallbackSvg = `<svg style="display:none;width:24px;height:24px" viewBox="0 0 24 24" fill="none" stroke="#047857" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M2 13h4l3-6h5v6h8v3H2v-3z" fill="#10b981"/><path d="M8 8l-2 5h4V8H8z" fill="#38bdf8"/></svg>`;
    } else if (isLori) {
      fallbackSvg = `<svg style="display:none;width:24px;height:24px" viewBox="0 0 24 24" fill="none" stroke="#047857" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="19" r="2.5"/><circle cx="18" cy="19" r="2.5"/><rect x="2" y="5" width="12" height="11" rx="1" fill="#10b981"/><path d="M14 9h4l3 4v3h-7V9z" fill="#047857"/></svg>`;
    } else {
      fallbackSvg = `<svg style="display:none;width:24px;height:24px" viewBox="0 0 24 24" fill="none" stroke="#047857" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="5" cy="18" r="3"/><circle cx="19" cy="18" r="3"/><path d="M5 18l4-8h4l3 8"/><path d="M12 10l2-4h3"/><circle cx="13" cy="5" r="1.5" fill="#047857"/></svg>`;
    }

    vehicleDisc.innerHTML = `<img src="${imgSrc}" alt="${point.label}" style="width:34px;height:28px;object-fit:contain;filter:drop-shadow(0 2px 3px rgba(0,0,0,0.25));" onError="this.style.display='none';if(this.nextElementSibling)this.nextElementSibling.style.display='block';" />${fallbackSvg}`;
    container.appendChild(vehicleDisc);

    return container;
  }

  if (point.kind === "pickup" || point.kind === "dropoff") {
    const isPickup = point.kind === "pickup";
    const bgBadge = isPickup ? "#15803d" : "#09261f";
    const pinBg = isPickup ? "#15803d" : "#09261f";
    const labelText = point.badge || (isPickup ? "Pickup" : "Dropoff");

    const container = document.createElement("div");
    container.setAttribute("aria-label", `${labelText}: ${point.label}`);
    container.style.cssText = [
      "display:flex",
      "flex-direction:column",
      "align-items:center",
      "cursor:pointer",
      "user-select:none",
      "transform:translate(0, -6px)",
    ].join(";");

    // Badge pill with label
    const badge = document.createElement("div");
    badge.textContent = labelText;
    badge.style.cssText = [
      `background:${bgBadge}`,
      "color:#ffffff",
      "font:800 12px/1.2 system-ui, -apple-system, sans-serif",
      "padding:5px 12px",
      "border-radius:9999px",
      "box-shadow:0 4px 12px rgba(0,0,0,0.35)",
      "margin-bottom:4px",
      "white-space:nowrap",
      "letter-spacing:0.01em",
    ].join(";");
    container.appendChild(badge);

    // Target circle pin with center dot (◎)
    const pin = document.createElement("div");
    pin.style.cssText = [
      "display:grid",
      "place-items:center",
      "width:24px",
      "height:24px",
      "border-radius:9999px",
      `background:${pinBg}`,
      "border:3px solid #ffffff",
      "box-shadow:0 3px 10px rgba(0,0,0,0.35)",
    ].join(";");

    const dot = document.createElement("div");
    dot.style.cssText = [
      "width:8px",
      "height:8px",
      "border-radius:9999px",
      "background:#ffffff",
    ].join(";");
    pin.appendChild(dot);
    container.appendChild(pin);

    return container;
  }

  const el = document.createElement("div");
  el.textContent = point.badge ?? "";
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
    a.style.cssText = "display:inline-block;margin-top:4px;color:#047857;font-weight:700";
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
  routeWaypoints,
  defaultView = "satellite",
  showLocateButton = false,
  locate = false,
  routeFromMe = false,
  deviceLocation,
  nextIndex,
  heightClass = "h-72 sm:h-80",
  note,
  heat = [],
  selectedLocation,
  onLocationSelect,
  locationPicker = false,
  onLocateMe,
}: {
  points: MapPoint[];
  ariaLabel: string;
  /** Draw a route line through the points in order or along routeWaypoints. */
  route?: boolean;
  /** Specific road waypoints for accurate polyline routing. */
  routeWaypoints?: LngLat[];
  defaultView?: "satellite" | "streets";
  showLocateButton?: boolean;
  /** Offer opt-in "Share my location" with distance to the next point. */
  locate?: boolean;
  /** Draw a live in-app guide from the device position to the first destination. */
  routeFromMe?: boolean;
  /** Rider position supplied by a parent that starts watching from a button tap. */
  deviceLocation?: LngLat | null;
  nextIndex?: number;
  heightClass?: string;
  note?: string;
  /** Shaded circles showing demand; bigger weight = bigger, stronger circle. */
  heat?: { geo: LngLat; weight: number }[];
  /** Enable click-to-place and draggable shop pin selection. */
  selectedLocation?: LngLat | null;
  onLocationSelect?: (location: LngLat) => void;
  locationPicker?: boolean;
  onLocateMe?: (location: LngLat) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const meMarker = useRef<maplibregl.Marker | null>(null);
  const selectedMarker = useRef<maplibregl.Marker | null>(null);
  const locationSelectRef = useRef(onLocationSelect);
  const selectedLocationRef = useRef(selectedLocation);
  const isLocationPicker = Boolean(onLocationSelect);
  const watchId = useRef<number | null>(null);
  const meRef = useRef<LngLat | null>(null);
  const [me, setMe] = useState<LngLat | null>(null);
  const [geoError, setGeoError] = useState("");
  const [view, setView] = useState<"satellite" | "streets">(defaultView);
  const viewRef = useRef(view);
  const pointsKey = JSON.stringify(points);
  const waypointsKey = JSON.stringify(routeWaypoints ?? []);
  const heatKey = JSON.stringify(heat);

  // Ensure MapLibre's stylesheet is loaded in the browser without Turbopack bundle errors.
  useEffect(() => {
    const id = "maplibre-gl-css";
    if (!document.getElementById(id)) {
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = "/maplibre/maplibre-gl.css";
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    locationSelectRef.current = onLocationSelect;
  }, [onLocationSelect]);

  useEffect(() => {
    selectedLocationRef.current = selectedLocation;
  }, [selectedLocation]);

  useEffect(() => {
    if (!deviceLocation) return;
    meRef.current = deviceLocation;
    const map = mapRef.current;
    if (!map) return;
    const target = (JSON.parse(pointsKey) as MapPoint[])[0];
    const firstFix = !meMarker.current;
    if (firstFix) meMarker.current = new maplibregl.Marker({ element: meDot() }).setLngLat(deviceLocation).addTo(map);
    else meMarker.current?.setLngLat(deviceLocation);
    if (routeFromMe && target) {
      const source = map.getSource("rider-route") as maplibregl.GeoJSONSource | undefined;
      source?.setData({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [deviceLocation, target.geo] } });
      if (firstFix) {
        map.fitBounds(new maplibregl.LngLatBounds(deviceLocation, deviceLocation).extend(target.geo), { padding: 64, maxZoom: 16, duration: 500 });
      }
    }
  }, [deviceLocation, routeFromMe, pointsKey]);

  useEffect(() => {
    const pts: MapPoint[] = JSON.parse(pointsKey);
    if (!container.current || (pts.length === 0 && !locationSelectRef.current)) return;
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
      center: selectedLocationRef.current ?? pts[0]?.geo ?? [39.2083, -6.7924],
      zoom: selectedLocationRef.current || pts.length ? 15 : 13,
      attributionControl: { compact: true },
      cooperativeGestures: true, // one-finger scrolling still scrolls the page on phones
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    const placePin = (geo: LngLat) => {
      if (!selectedMarker.current) {
        const el = document.createElement("div");
        el.setAttribute("aria-label", "Selected shop pickup location");
        el.style.cssText = "width:34px;height:34px;border-radius:9999px;background:#059669;border:4px solid #fff;box-shadow:0 4px 14px rgba(0,0,0,.45);cursor:grab";
        selectedMarker.current = new maplibregl.Marker({ element: el, draggable: true, anchor: "bottom" })
          .setLngLat(geo)
          .addTo(map);
        selectedMarker.current.on("dragend", () => {
          const p = selectedMarker.current?.getLngLat();
          if (p) locationSelectRef.current?.([p.lng, p.lat]);
        });
      } else {
        selectedMarker.current.setLngLat(geo);
      }
      locationSelectRef.current?.(geo);
    };
    if (locationSelectRef.current) {
      if (selectedLocationRef.current) {
        const el = document.createElement("div");
        el.setAttribute("aria-label", "Selected shop pickup location");
        el.style.cssText = "width:34px;height:34px;border-radius:9999px;background:#059669;border:4px solid #fff;box-shadow:0 4px 14px rgba(0,0,0,.45);cursor:grab";
        selectedMarker.current = new maplibregl.Marker({ element: el, draggable: true, anchor: "bottom" }).setLngLat(selectedLocationRef.current).addTo(map);
        selectedMarker.current.on("dragend", () => {
          const p = selectedMarker.current?.getLngLat();
          if (p) locationSelectRef.current?.([p.lng, p.lat]);
        });
      }
      map.on("click", (event) => placePin([event.lngLat.lng, event.lngLat.lat]));
    }

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
            "circle-color": "#10b981",
            "circle-opacity": 0.35,
            "circle-stroke-color": "#059669",
            "circle-stroke-width": 2,
            // Grows with demand and with zoom.
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 11, ["*", 10, ["get", "w"]], 16, ["*", 40, ["get", "w"]]],
          },
        });
      }
      const waypts: LngLat[] = JSON.parse(waypointsKey);
      const coords = waypts.length > 1 ? waypts : pts.map((p) => p.geo);

      if (route && coords.length > 1) {
        map.addSource("guide", {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: { type: "LineString", coordinates: coords },
          },
        });

        // Crisp white underlayer casing for contrast
        map.addLayer({
          id: "guide-casing",
          type: "line",
          source: "guide",
          paint: {
            "line-color": "#ffffff",
            "line-width": 8.5,
            "line-opacity": 0.85,
          },
        });

        // Solid deep green road route like Bolt / Google Maps
        map.addLayer({
          id: "guide",
          type: "line",
          source: "guide",
          layout: {
            "line-join": "round",
            "line-cap": "round",
          },
          paint: {
            "line-color": "#165534",
            "line-width": 5.5,
            "line-opacity": 0.95,
          },
        });
      }
      if (routeFromMe && pts.length > 0) {
        map.addSource("rider-route", {
          type: "geojson",
          data: meRef.current
            ? { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [meRef.current, pts[0].geo] } }
            : { type: "FeatureCollection", features: [] },
        });
        map.addLayer({ id: "rider-route", type: "line", source: "rider-route", paint: { "line-color": "#2563eb", "line-width": 5, "line-opacity": 0.9 } });
      }
      if (coords.length > 1) {
        const bounds = new maplibregl.LngLatBounds(coords[0], coords[0]);
        coords.forEach((c) => bounds.extend(c));
        map.fitBounds(bounds, { padding: 56, maxZoom: 16, duration: 0 });
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
      meMarker.current = null;
      selectedMarker.current = null;
    };
  }, [pointsKey, waypointsKey, heatKey, route, routeFromMe, isLocationPicker]);

  useEffect(() => {
    if (!mapRef.current || !locationSelectRef.current) return;
    if (!selectedLocation) {
      selectedMarker.current?.remove();
      selectedMarker.current = null;
      return;
    }
    const map = mapRef.current;
    if (!selectedMarker.current) {
      const el = document.createElement("div");
      el.setAttribute("aria-label", "Selected shop pickup location");
      el.style.cssText = "width:34px;height:34px;border-radius:9999px;background:#059669;border:4px solid #fff;box-shadow:0 4px 14px rgba(0,0,0,.45);cursor:grab";
      selectedMarker.current = new maplibregl.Marker({ element: el, draggable: true, anchor: "bottom" }).setLngLat(selectedLocation).addTo(map);
      map.flyTo({ center: selectedLocation, zoom: 17, duration: 700 });
      selectedMarker.current.on("dragend", () => {
        const p = selectedMarker.current?.getLngLat();
        if (p) locationSelectRef.current?.([p.lng, p.lat]);
      });
    } else {
      selectedMarker.current.setLngLat(selectedLocation);
    }
  }, [selectedLocation]);

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
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const here: LngLat = [pos.coords.longitude, pos.coords.latitude];
        meRef.current = here;
        setMe(here);
        if (!mapRef.current) return;
        const map = mapRef.current;
        const firstFix = !meMarker.current;
        if (firstFix) meMarker.current = new maplibregl.Marker({ element: meDot() }).setLngLat(here).addTo(map);
        else meMarker.current?.setLngLat(here);
        if (routeFromMe && points.length > 0) {
          const source = map.getSource("rider-route") as maplibregl.GeoJSONSource | undefined;
          source?.setData({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [here, points[0].geo] } });
          if (firstFix) {
            const bounds = new maplibregl.LngLatBounds(here, here).extend(points[0].geo);
            map.fitBounds(bounds, { padding: 64, maxZoom: 16, duration: 500 });
          }
        }
      },
      (err) => setGeoError(err.code === err.PERMISSION_DENIED ? "Location permission was denied." : "Could not get your location."),
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 20_000 },
    );
  };

  const locateForPicker = () => {
    if (!navigator.geolocation || !mapRef.current) return;
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const geo: LngLat = [coords.longitude, coords.latitude];
        mapRef.current?.flyTo({ center: geo, zoom: 16, duration: 900 });
        if (onLocateMe) onLocateMe(geo);
        if (locationSelectRef.current) {
          if (!selectedMarker.current) {
            const el = document.createElement("div");
            el.setAttribute("aria-label", "Selected shop pickup location");
            el.style.cssText = "width:34px;height:34px;border-radius:9999px;background:#059669;border:4px solid #fff;box-shadow:0 4px 14px rgba(0,0,0,.45);cursor:grab";
            selectedMarker.current = new maplibregl.Marker({ element: el, draggable: true, anchor: "bottom" }).setLngLat(geo).addTo(mapRef.current!);
            selectedMarker.current.on("dragend", () => {
              const p = selectedMarker.current?.getLngLat();
              if (p) locationSelectRef.current?.([p.lng, p.lat]);
            });
          } else selectedMarker.current.setLngLat(geo);
          locationSelectRef.current?.(geo);
        }
      },
      () => setGeoError("Could not get your location. You can still tap the map to place the shop pin."),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
  };

  const stopSharing = () => {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
    meMarker.current?.remove();
    meMarker.current = null;
    setMe(null);
    meRef.current = null;
    const routeSource = mapRef.current?.getSource("rider-route") as maplibregl.GeoJSONSource | undefined;
    routeSource?.setData({ type: "FeatureCollection", features: [] });
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
        {(locationPicker || showLocateButton) && (
          <button
            type="button"
            onClick={locateForPicker}
            aria-label="Tafuta eneo langu"
            title="Tafuta eneo langu"
            className="absolute bottom-3 right-3 z-10 grid h-11 w-11 place-items-center rounded-full bg-white text-stone-800 shadow-lg ring-1 ring-black/10 hover:bg-stone-50 active:scale-95 transition"
          >
            <Crosshair size={20} strokeWidth={2.2} />
          </button>
        )}
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
        {geoError || note || "Map locations may be approximate."}
        {locate && !geoError && " Your location stays on this device."}
      </p>
    </div>
  );
}
