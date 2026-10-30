# KARIAKOO — Rider routing & live anti-theft tracking (research + plan)

_Date: 2026-10-30 · Plain-language plan for a non-technical founder._

Two things you asked for, kept separate because they are two different jobs:

1. **Routing** — "which way should the rider go, how far, how long" (the Bolt-style map).
2. **Live tracking for security** — "when the parcel is picked up, share the rider's
   location automatically so goods can't be stolen."

**Good news first:** you are already ~70% of the way there. KARIAKOO already stores
the rider's GPS position, already lets the customer see the assigned rider's live
position during a delivery, already has free maps, and already has a delivery PIN.
You mostly need to make the sharing **automatic and continuous**, and add a **route
line + distance/time**. You do **not** need to pay for expensive map services.

---

## 1. What you already have (don't rebuild these)

| Piece | What it does | Where |
|-------|--------------|-------|
| `rider_presence` (lat/lng, is_online) | Stores each rider's current GPS position | DB |
| `rider_update_location` | Rider app pushes a fresh GPS fix to the server | RPC |
| `customer_get_order_rider_location` | Customer sees the **assigned rider's live position** during ACCEPTED / PICKED_UP / IN_TRANSIT | RPC |
| `admin_get_order_map_locations` | Admin can see rider + drop-off pins for an order | RPC |
| `order_dropoff_locations` | Customer's exact **drop-off pin on the map** (not a typed address) | DB |
| Delivery PIN | Customer gives the rider a 4-digit code to confirm hand-over | RPC |
| MapLibre + free CARTO/OSM tiles | Draws maps **with no paid key** | web |
| `haversine` / `fmtDist` | Straight-line distance maths | code |

So the "share rider location" machinery exists. The gaps are: make it **start on
pickup, update continuously, and stop on delivery**, and add the **route/ETA** on top.

---

## 2. Your anti-theft idea — how to finish it (recommended first)

Your instinct is correct and it's the cheaper half. The design, based on how Uber/Bolt
and delivery apps actually do it (see Sources — they tie tracking to the **active
trip only**):

**The rule: track only during an active delivery, and be open about it.**

- **Starts automatically** the moment the rider swipes "Picked up" (status → `PICKED_UP`).
- **Updates every ~4–5 seconds** while the parcel is in transit.
- **Stops automatically** when the delivery completes (PIN confirmed → `DELIVERED`) or is cancelled.
- The **customer** sees a live moving dot heading to them, plus "Your rider is sharing
  live location." The **admin/dispatch** can watch any active delivery on a map.
- The rider sees a clear "You are sharing live location for this delivery" banner
  (industry norm: a visible indicator; consent at sign-up; sharing never runs outside
  an active job). This keeps it fair and privacy-respecting.

**Why this fights theft:**
- A parcel in transit is on a live map watched by the customer *and* your dispatch.
- Every position is timestamped, so if a parcel goes missing you have an **audit trail**
  of exactly where the rider was and when.
- Combined with the **delivery PIN** (already built) and a photo proof-of-delivery
  (small add-on), you get a full chain of custody: picked up → tracked route → PIN at
  hand-over.

**How it's built (uses what you have):**
- The rider's phone sends its GPS over **Supabase Realtime "Broadcast"** every few
  seconds. Broadcast is designed for exactly this — it's cheap and does **not** write a
  database row on every ping. Save the position to the database only about **once a
  minute** for the history/audit trail. (This is the standard pattern; one logistics
  build reports 50–120 ms from phone to the viewer's map.)
- Keep the existing rule that only the order's customer + admin can see it (your RLS).

**Privacy guardrails (important, and simple):**
- Only while on an active delivery. Never when off-shift or idle.
- Rider agrees once at sign-up; a visible "sharing live" indicator during the trip.
- Location history is kept for a limited window (e.g. 30–90 days) for dispute/theft
  investigation, then deleted. Precise location is treated as sensitive data.

---

## 3. Routing — "which way, how far, how long"

### The honest truth about Bolt-style in-app navigation
Full turn-by-turn navigation inside your own app (voice, "turn left in 200 m") is a
large, expensive feature — and even Bolt's own drivers often just use Google Maps.
You do **not** need to build that to launch. Two cheaper levels get you 90% of the value:

### Option A — Launch now, near-zero cost (recommended first)
- **Distance & ETA for the fare:** use straight-line (`haversine`, already in your
  code) × a small road-factor (~1.3) for a good-enough estimate. Enough to price a
  delivery and show the rider "~3.2 km, ~12 min" on the job offer.
- **Navigation:** a **"Navigate" button** that opens the rider's own **Google Maps**
  (or any map app) with the drop-off pin. Zero cost, familiar to every rider, always
  up to date. This is what most small delivery apps do.
- You already draw the rider + drop-off on a MapLibre map; just add the "Navigate"
  button and the estimate.

### Option B — Real road routes (add when you want the blue line + accurate ETA)
Draw the actual road route and show accurate road distance/time. Use an **open-source
routing engine** — MapLibre just draws whatever route the engine returns, so no paid
map key is needed:

| Engine | Motorcycle (boda) profile | Cost | Notes |
|--------|---------------------------|------|-------|
| **OpenRouteService (ORS)** ✅ recommended | **Yes** (motorcycle + scooter, beta) | **Free hosted: 2,000 routes/day**; self-host = unlimited & free | Easiest start — just call their free API |
| OSRM | No built-in moto profile | Free, self-host | Very fast but rigid; heavier to run |
| GraphHopper | Yes (beta) | Free, self-host (Apache-2.0) | Good alternative to ORS |
| Google Directions / MapTiler | Yes | **Paid** (per request / commercial licence) | Avoid at your stage; you already noted MapTiler needs a paid licence |

**Recommendation:** start on ORS's **free hosted API** (2,000 routes/day is plenty at
launch). If you ever exceed that, **self-host ORS or OSRM** on a cheap server for
unlimited free routing. No code is thrown away — you just swap the address you call.

### Option C — Scale later
Self-host the routing engine (ORS/OSRM) once daily volume is high. Unlimited, free,
you just pay for a small server.

---

## 4. Dar es Salaam reality (this shapes the design)

- **Addresses are informal.** Much of Dar can't be found by a typed street address.
  The research confirms OSM map data for the city was historically weak but is
  improving (Ramani Huria / Humanitarian OpenStreetMap mapped many roads and the
  dala-dala routes).
- **So: keep using the map pin, not typed addresses.** You already do this
  (`order_dropoff_locations`). This is the single most important local decision — a
  customer dropping a pin beats any address box in Dar. Keep leaning on it.
- **Boda routing is "good enough," not perfect.** Open routing on OSM roads works for
  distance/ETA and a route line; it won't know every unpaved shortcut a boda takes —
  which is exactly why the "open Google Maps to navigate" handoff (Option A) is a smart
  default for the actual riding.

---

## 5. Recommended roadmap (what to build, in order)

1. **Phase 1 — Auto live-tracking for security (your idea).** Rider location auto-shares
   from "Picked up" to "Delivered", continuously, on the customer + admin map, with the
   privacy guardrails. Add a simple distance/ETA estimate (haversine × road factor) to
   the job offer and a "Navigate" button that opens Google Maps. _Mostly wiring up what
   you already have — biggest safety payoff, lowest cost._
2. **Phase 2 — Real road route + accurate ETA.** Add OpenRouteService (free hosted API,
   motorcycle profile). Draw the route line on the existing map; use real road distance
   in the fare. _One new integration; no paid keys._
3. **Phase 3 — Proof of delivery + history retention.** Photo at hand-over alongside the
   PIN; auto-delete old location history after the retention window. _Completes the
   anti-theft chain of custody._
4. **Phase 4 (only if needed) — Self-host routing** for unlimited free routes at scale.

---

## 6. Cost summary

| Thing | Cost at launch |
|-------|---------------|
| Maps (MapLibre + CARTO/OSM tiles) | **Free** (already in use) |
| Live tracking (Supabase Realtime Broadcast) | **Free / already paid** (part of Supabase) |
| Routing (OpenRouteService free API) | **Free** up to 2,000 routes/day |
| In-app navigation | **Free** (hand off to the rider's Google Maps) |
| Self-hosted routing (later, optional) | ~cost of one small server |

You can ship the whole security feature and a usable fare/ETA **without paying for any
map or routing service.**

---

## 7. Sources

- Bolt driver flow (accept → pick up → drive → repeat; in-app navigation): [Bolt Driver — App Store](https://apps.apple.com/gb/app/bolt-driver/id897442736)
- Routing engine comparison, motorcycle profiles: [openrouteservice — why ORS](https://giscience.github.io/openrouteservice-workshop/getting_started/02_why.html)
- ORS free limits (2,000 directions/day) & free self-host: [openrouteservice plans](https://openrouteservice.org/plans/), [ORS self-host limits (forum)](https://ask.openrouteservice.org/t/limitations-on-self-hosted-openrouteservice/5512)
- OSRM self-host / resource notes: [Install OSRM (LinuxBabe)](https://www.linuxbabe.com/?p=159805)
- Supabase Realtime live-location pattern (Broadcast + occasional DB save): [Real-time delivery tracking with Supabase & GPS](https://kitemetric.com/blogs/real-time-delivery-tracking-with-supabase-and-gps), [Supabase Flutter Uber clone](https://supabase.com/blog/flutter-uber-clone)
- Driver-location privacy norms (track only on active trip, consent, visible indicator): [Uber driver privacy notice — continuous location](https://conductatlas.com/platform/uber/uber-privacy-notice/continuous-location-tracking)
- Dar es Salaam OSM mapping / data quality: [Ramani Huria — mapping Dar dala dalas](https://ramanihuria.org/en/2016/01/12/putting-dar-es-salaam-dala-dalas-on-the-map/)
