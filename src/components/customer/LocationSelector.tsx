"use client";

import { MapPin } from "lucide-react";
import { useId } from "react";
import { useI18n } from "@/i18n/client";
import { deliveryZones } from "@/lib/delivery";
import { useDeliveryZone } from "@/lib/preferences-store";
import type { DeliveryZoneId } from "@/lib/types";

export function LocationSelector({ tone = "light" }: { tone?: "light" | "dark" }) {
  const { zone, setZone } = useDeliveryZone();
  const id = useId();
  const { t } = useI18n();
  const dark = tone === "dark";
  return (
    <div className={`flex min-w-0 items-center gap-1.5 text-sm ${dark ? "text-white" : "text-ink"}`}>
      <MapPin size={16} className={dark ? "text-brand-300" : "text-brand-600"} aria-hidden="true" />
      <label htmlFor={id} className={`shrink-0 ${dark ? "text-white/70" : "text-muted"}`}>
        {t.nav.deliverTo}
      </label>
      <select
        id={id}
        value={zone}
        onChange={(e) => setZone(e.target.value as DeliveryZoneId)}
        className={`min-w-0 max-w-44 cursor-pointer truncate rounded-lg bg-transparent py-1 pr-1 font-semibold outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${dark ? "text-white [&>option]:text-ink" : ""}`}
      >
        {deliveryZones.map((z) => (
          <option key={z.id} value={z.id}>{z.name}</option>
        ))}
      </select>
    </div>
  );
}
