import { Banknote, MapPin, Navigation, Phone, Store } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Timeline } from "@/components/orders/Timeline";
import { DeliveryFlow } from "@/components/rider/DeliveryFlow";
import { MapLoader } from "@/components/map/MapLoader";
import type { MapPoint } from "@/components/map/MarketMap";
import { Badge } from "@/components/ui/Badge";
import { requireRole } from "@/lib/auth/session";
import { riderJob } from "@/lib/data/access";
import { getZone } from "@/lib/delivery";
import { formatTzs } from "@/lib/format";
import { formatTzPhone } from "@/lib/validation/checkout";

export const metadata: Metadata = { title: "Delivery" };

const mapsLink = (address: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${address}, Dar es Salaam, Tanzania`)}`;

export default async function RiderJobPage({ params }: PageProps<"/rider/jobs/[id]">) {
  const { id } = await params;
  const job = riderJob(await requireRole("rider"), id);
  // Not assigned to this rider → same as not existing.
  if (!job) notFound();
  const navLink = "inline-flex h-11 items-center gap-1.5 rounded-full bg-night px-4 text-sm font-semibold text-white";
  const stops: MapPoint[] = [
    ...job.pickups.flatMap((p, i) => (p.geo ? [{ id: `pickup-${i}`, kind: "pickup" as const, badge: String(i + 1), label: `Pick up: ${p.shopName}`, geo: p.geo }] : [])),
    ...(job.dropoffGeo ? [{ id: "dropoff", kind: "dropoff" as const, label: `Deliver: ${job.dropoffAddress}`, geo: job.dropoffGeo }] : []),
  ];
  // Before pickup the next stop is the first shop; after pickup it is the customer.
  const nextStop = ["PICKED_UP", "IN_TRANSIT"].includes(job.status) ? stops.length - 1 : ["DELIVERED", "FAILED", "CANCELLED"].includes(job.status) ? -1 : 0;

  return (
    <div className="space-y-4">
      <Link href="/rider" className="text-sm font-medium text-brand-700">← Deliveries</Link>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{job.reference}</h1>
        <span className="font-semibold">{formatTzs(job.payoutTzs)}</span>
      </div>

      <MapLoader
        points={stops}
        ariaLabel="Delivery map showing pickup and drop-off points"
        route
        locate
        nextIndex={nextStop}
        note="Demo locations are approximate. The dashed line is a guide, not a road route: use Navigate for directions."
      />

      <DeliveryFlow orderId={job.orderId} initial={job.status} />

      <section aria-labelledby="pickup-heading" className="rounded-3xl bg-white p-4">
        <h2 id="pickup-heading" className="font-semibold">1. Pick up ({job.pickups.length} {job.pickups.length === 1 ? "shop" : "shops"})</h2>
        <ul className="mt-3 space-y-3">
          {job.pickups.map((p) => (
            <li key={p.shopName} className="rounded-2xl bg-subtle p-3">
              <p className="flex items-center gap-2 font-medium"><Store size={16} aria-hidden="true" /> {p.shopName}</p>
              <p className="mt-1 text-sm text-muted">{p.address} · {p.itemCount} {p.itemCount === 1 ? "item" : "items"}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <a href={mapsLink(p.address)} target="_blank" rel="noopener noreferrer" className={navLink}>
                  <Navigation size={16} aria-hidden="true" /> Navigate
                </a>
                <Badge tone={p.ready ? "success" : "warning"}>{p.ready ? "Ready for pickup" : "Shop still preparing"}</Badge>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="dropoff-heading" className="rounded-3xl bg-white p-4">
        <h2 id="dropoff-heading" className="font-semibold">2. Deliver</h2>
        <p className="mt-2 flex gap-2 text-sm"><MapPin size={16} className="mt-0.5 shrink-0 text-brand-600" aria-hidden="true" /> {job.dropoffAddress}, {getZone(job.zone).name}</p>
        {job.instructions && <p className="mt-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">“{job.instructions}”</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          <a href={mapsLink(job.dropoffAddress)} target="_blank" rel="noopener noreferrer" className={navLink}>
            <Navigation size={16} aria-hidden="true" /> Navigate
          </a>
          {job.customer && (
            <a href={`tel:${job.customer.phone}`} className="inline-flex h-11 items-center gap-1.5 rounded-full border border-line px-4 text-sm font-semibold">
              <Phone size={16} aria-hidden="true" /> Call {job.customer.name.split(" ")[0]}
            </a>
          )}
        </div>
        {job.customer ? (
          <p className="mt-2 text-xs text-muted">Customer: {job.customer.name}, {formatTzPhone(job.customer.phone)}</p>
        ) : (
          <p className="mt-2 text-xs text-muted">Customer contact details appear only after you accept and while the delivery is active.</p>
        )}
        {job.cashToCollectTzs > 0 && (
          <p className="mt-3 flex items-center gap-2 rounded-xl bg-brand-50 p-3 text-sm font-semibold text-brand-800">
            <Banknote size={16} aria-hidden="true" /> Collect cash: {formatTzs(job.cashToCollectTzs)}
          </p>
        )}
      </section>

      {job.history.length > 0 && (
        <section aria-labelledby="log-heading" className="rounded-3xl bg-white p-4">
          <h2 id="log-heading" className="mb-3 font-semibold">Delivery log</h2>
          <Timeline events={job.history} />
        </section>
      )}
    </div>
  );
}
