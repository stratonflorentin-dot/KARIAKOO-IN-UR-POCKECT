# Nearby rider discovery & live tracking — audit + plan

_Date: 2026-10-31 · Audit of the existing system, then a phased plan to add the
"riders near you" map (Bolt/Uber style) for cargo delivery._

> Note: the "attached map reference" image did not arrive with the request; this
> is written from the description (nearby vehicles on a map, user location,
> movement, pickup ETA).

## 1. Audit — what already exists (reuse, don't rebuild)

| Capability the spec asks for | Already in KARIAKOO | Where |
|------------------------------|---------------------|-------|
| Map rendering (OSM tiles) | ✅ **MapLibre GL** + free CARTO/OSM tiles | `components/map/MarketMap.tsx`, `MapLoader.tsx` |
| Customer location (Geolocation API) | ✅ `AppLocationProvider` (`watchPosition`) | `components/location/` |
| Rider GPS capture + send | ✅ `rider_update_location`, `rider_ping_delivery_location` | DB RPCs + `AvailabilityToggle` |
| Rider live position store | ✅ `rider_presence` (rider_id, is_online, lat, lng, updated_at) | DB |
| Live **assigned-rider** tracking for the customer | ✅ `customer_get_order_rider_location` + `LiveRiderMap` (5s poll) | `components/orders/LiveRiderMap.tsx` |
| Durable location trail (anti-theft) | ✅ `delivery_location_pings` + 90-day prune | DB |
| Vehicle types + capacity + tariffs | ✅ `parcel-transport.ts` (pikipiki / bajaji / pickup / lori_dogo) | lib |
| Dispatch / offer / accept / assignment | ✅ `delivery_offers`, `auto_dispatch_delivery`, `rider_refresh_offers`, `rider_accept_offer` | DB |
| Order lifecycle (PENDING→ASSIGNED→…→DELIVERED) | ✅ `deliveries` + status machine | DB |
| Stale-GPS guard, RLS, PIN, trail | ✅ throughout | DB |

**So ~70% of the spec is already built.** The genuinely new parts are: a *nearby
available riders* query, a *discovery map* for the pre-order customer, *realtime*
rider movement (today it polls), *route-based ETA*, and a richer *availability
state* model.

**Not present (and the right calls):** no Leaflet (✅ reuse MapLibre — adding
Leaflet would be the "duplicate system" the spec forbids); PostGIS is **off**
(not needed — a bounding-box + haversine query is fine at city scale and avoids a
heavy extension); `rider_presence` has no heading/speed/accuracy columns yet.

## 2. Key design decisions (read before building)

### 2a. Privacy & safety — discovery shows *approximate* positions
Showing every available rider's **precise** live GPS to **any** customer who opens
the app lets anyone track any rider in real time — a real safety problem, and it
doesn't scale to "hundreds of riders." Bolt/Uber deliberately show **approximate**
vehicle positions during discovery and reveal **precise** GPS only for the rider
**assigned to your order** (which KARIAKOO already does via
`customer_get_order_rider_location`). So:
- **Discovery map:** coarse positions (snapped to a ~100–200 m grid / slightly
  jittered), vehicle type + count + nearest ETA. No rider identity.
- **After booking:** precise live GPS of the assigned rider only (already built).

This is also the only way RLS can stay safe: a discovery RPC returns *derived,
de-identified* points, never raw `rider_presence` rows to customers.

### 2b. Availability states — derive, don't fight the schema
The spec's 6 states (OFFLINE / ONLINE_AVAILABLE / REQUEST_PENDING / BUSY /
ON_TRIP / TEMPORARILY_UNAVAILABLE) are **derivable today**:
`is_online=false → OFFLINE`; online + no active delivery + no pending offer →
`ONLINE_AVAILABLE`; has a pending offer → `REQUEST_PENDING`; has an
ACCEPTED/PICKED_UP/IN_TRANSIT delivery → `ON_TRIP`. Discovery already filters to
"online, approved, not on an active delivery" in `auto_dispatch_delivery`. I'll
reuse that exact predicate so discovery and dispatch never disagree. A stored
enum can come later if needed.

### 2c. Realtime at scale — Broadcast, not table replication
Replicating `rider_presence` row-changes to every customer for hundreds of riders
pinging every few seconds is heavy. Use **Supabase Realtime Broadcast** on an
area channel (riders publish throttled coarse pings; customers subscribe to their
viewport's area), with the DB holding only the last-known position. The assigned-
order tracking can stay on the existing cheap poll or move to Broadcast later.

### 2d. Routing/ETA — OSRM/OpenRouteService (see the routing plan doc)
Per `docs/rider-routing-and-live-tracking-plan.md`: start with
OpenRouteService's free API (motorcycle profile) or a self-hosted OSRM for
rider→customer route distance + ETA; fall back to haversine×road-factor and label
the ETA "approximate" when routing is unavailable (the spec requires this
fallback).

### 2e. Concurrency with the parallel build
The vehicle/dispatch/pricing subsystem is being actively built by a parallel
process. This feature overlaps it, so every change here is **additive** — new
RPCs and a new map component — and avoids editing the churning
dispatch/pricing/`place_order` code.

## 3. Phased plan

**Phase 1 — Nearby discovery (backend + map). _The new core._**
- `nearby_available_riders(p_lat, p_lng, p_radius_m, p_vehicle text default null)`
  — SECURITY DEFINER RPC. Bounding-box prefilter + haversine, returns **coarse,
  de-identified** points: `{ vehicle, approx_lat, approx_lng, distance_m }` for
  riders who are online + approved + fresh (`updated_at > now()-interval '90s'`) +
  **not** on an active delivery (reusing the dispatch predicate), optionally
  filtered by vehicle. RLS-safe: customers never see raw rows or identities.
- A customer **discovery map** component (reuse `MapLoader`/MarketMap): the
  customer's location, vehicle-type icons for nearby riders, a vehicle filter
  (motorcycle/bajaji/pickup), and a "nearest ~X min away" readout. Add vehicle
  marker icons (pikipiki/bajaji/pickup) to the map renderer.
- Add `heading`, `speed`, `accuracy` to `rider_presence` (optional columns) so
  icons can show direction and markers animate.

**Phase 2 — Realtime movement.** Riders broadcast throttled coarse pings while
`ONLINE_AVAILABLE`; the discovery map subscribes and animates markers between
points; stale pings (>90 s) drop off. Reuses `AppLocationProvider`.

**Phase 3 — Route-based ETA.** Wire OpenRouteService/OSRM for rider→customer ETA
in the rider popup and customer→destination route after booking; haversine
fallback labelled "approximate".

**Phase 4 — Booking → assignment integration.** On confirm, use the **existing**
order + dispatch flow to assign the selected/accepted rider, lock availability
(they already drop out of discovery once on an active delivery), and switch the
customer to the **existing** precise assigned-rider tracking. _Mostly wiring
what's already there — no new order system._

## 4. Deliverables (produced as the phases land)
Files created/modified, migrations, Supabase config (realtime channels, any env),
env vars (routing API key if using ORS hosted), two-device test script
(rider online on phone A → appears on customer phone B → move → filter → book →
assigned tracking → complete → reappears), external deps (ORS/OSRM), and
limitations (coarse discovery positions by design; ETA approximate without
routing; realtime tuning for very high rider counts).

## 5. Recommended start
**Phase 1** is the right first slice: it's the genuinely new, non-colliding core
(discovery RPC + map), it's privacy-safe, and it slots onto the existing map,
GPS, vehicle and dispatch infrastructure without touching the parallel build.
