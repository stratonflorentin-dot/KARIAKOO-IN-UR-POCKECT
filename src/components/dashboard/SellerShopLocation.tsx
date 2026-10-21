"use client";

import { useState, useTransition } from "react";
import { Crosshair, MapPin, Trash2 } from "lucide-react";
import { MapLoader } from "@/components/map/MapLoader";
import type { LngLat } from "@/components/map/MarketMap";
import { saveSellerShopLocation } from "@/app/[lang]/seller/location-actions";

export function SellerShopLocation({
  shopName,
  initialLocation,
  labels,
}: {
  shopName: string;
  initialLocation: LngLat | null;
  labels: {
    title: string;
    description: string;
    mapLabel: string;
    selected: string;
    notSelected: string;
    save: string;
    saving: string;
    remove: string;
    saved: string;
  };
}) {
  const [location, setLocation] = useState<LngLat | null>(initialLocation);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  const save = (next: LngLat | null) => {
    setMessage("");
    startTransition(async () => {
      try {
        await saveSellerShopLocation(next?.[1] ?? null, next?.[0] ?? null);
        setLocation(next);
        setMessage(labels.saved);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Could not save shop location.");
      }
    });
  };

  return (
    <section className="rounded-3xl border border-stone-200/80 bg-white p-4 shadow-sm shadow-stone-950/[0.025] sm:p-5" aria-labelledby="seller-location-title">
      <div className="mb-3">
        <h2 id="seller-location-title" className="font-semibold tracking-tight text-ink">{labels.title}</h2>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">{labels.description}</p>
      </div>
      <MapLoader
        points={[]}
        ariaLabel={`${labels.mapLabel}: ${shopName}`}
        heightClass="h-72 sm:h-80"
        selectedLocation={location}
        onLocationSelect={setLocation}
        locationPicker
        note={labels.notSelected}
      />
      <p className="mt-3 flex items-center gap-2 text-sm text-muted" aria-live="polite">
        <MapPin size={16} aria-hidden="true" />
        {location ? `${labels.selected}: ${location[1].toFixed(6)}, ${location[0].toFixed(6)}` : labels.notSelected}
      </p>
      {message && <p className="mt-2 text-sm text-brand-700" role="status">{message}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={!location || pending} onClick={() => save(location)} className="inline-flex h-11 items-center gap-2 rounded-full bg-brand-700 px-4 text-sm font-semibold text-white disabled:opacity-50">
          <Crosshair size={16} aria-hidden="true" /> {pending ? labels.saving : labels.save}
        </button>
        {location && (
          <button type="button" disabled={pending} onClick={() => save(null)} className="inline-flex h-11 items-center gap-2 rounded-full border border-line px-4 text-sm font-semibold text-ink disabled:opacity-50">
            <Trash2 size={16} aria-hidden="true" /> {labels.remove}
          </button>
        )}
      </div>
    </section>
  );
}
