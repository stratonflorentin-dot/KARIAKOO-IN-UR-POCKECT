"use client";

// Admin pricing control panel. Edits the active pricing_configs row and manages
// surge_zones. Commission is entered as a percentage (converted to bps on the
// server). All writes are RLS-gated to admins.
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  addSurgeZone,
  deleteSurgeZone,
  savePricingConfig,
  setSurgeZoneActive,
  type ActionResult,
} from "@/app/[lang]/admin/pricing/actions";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { compactInputClass } from "@/components/ui/Field";

export interface PricingConfigRow {
  base_fare_tzs: number;
  per_km_rate_tzs: number;
  per_min_rate_tzs: number;
  minimum_fare_tzs: number;
  booking_fee_tzs: number;
  seller_commission_bps: number;
  rider_commission_bps: number;
  free_waiting_mins: number;
  paid_waiting_per_min_tzs: number;
  cancellation_fee_tzs: number;
  cancellation_grace_mins: number;
}

export interface SurgeZoneRow {
  id: string;
  zone_name: string;
  multiplier: number;
  is_active: boolean;
  reason: string;
}

function NumberField({ label, name, defaultValue, step = 1, suffix }: { label: string; name: string; defaultValue: number; step?: number; suffix?: string }) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <div className="mt-1 flex items-center gap-2">
        <input name={name} type="number" min={0} step={step} defaultValue={defaultValue} className={`${compactInputClass} w-36`} />
        {suffix && <span className="text-xs text-muted">{suffix}</span>}
      </div>
    </label>
  );
}

export function PricingControls({ config, zones }: { config: PricingConfigRow; zones: SurgeZoneRow[] }) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<ActionResult>, okMsg: string) {
    setBusy(true);
    setMsg("");
    const res = await action();
    setBusy(false);
    setMsg(res.ok ? okMsg : res.error ?? "Something went wrong.");
    if (res.ok) router.refresh();
  }

  async function onSaveConfig(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await run(() => savePricingConfig(fd), "Pricing saved.");
  }

  async function onAddZone(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    await run(() => addSurgeZone(fd), "Surge zone added.");
    form.reset();
  }

  return (
    <div className="space-y-6">
      <p role="status" aria-live="polite" className="min-h-5 text-sm text-emerald-800">{msg}</p>

      <Card aria-labelledby="fare-rates">
        <h2 id="fare-rates" className="font-semibold">Delivery fare rates</h2>
        <p className="text-sm text-muted">Fee = max(base + km×rate + min×rate + paid waiting, minimum) × surge.</p>
        <form onSubmit={onSaveConfig} className="mt-4 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <NumberField label="Base fare" name="base_fare_tzs" defaultValue={config.base_fare_tzs} step={100} suffix="TZS" />
            <NumberField label="Per kilometre" name="per_km_rate_tzs" defaultValue={config.per_km_rate_tzs} step={50} suffix="TZS/km" />
            <NumberField label="Per minute" name="per_min_rate_tzs" defaultValue={config.per_min_rate_tzs} step={10} suffix="TZS/min" />
            <NumberField label="Minimum fare" name="minimum_fare_tzs" defaultValue={config.minimum_fare_tzs} step={100} suffix="TZS" />
            <NumberField label="Booking / service fee" name="booking_fee_tzs" defaultValue={config.booking_fee_tzs} step={100} suffix="TZS" />
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Platform commission (admin only)</h3>
            <div className="mt-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <label className="block">
                <span className="text-sm font-medium">Seller commission</span>
                <div className="mt-1 flex items-center gap-2">
                  <input name="seller_commission_pct" type="number" min={0} max={100} step={0.5} defaultValue={config.seller_commission_bps / 100} className={`${compactInputClass} w-36`} />
                  <span className="text-xs text-muted">% of items</span>
                </div>
              </label>
              <label className="block">
                <span className="text-sm font-medium">Rider commission</span>
                <div className="mt-1 flex items-center gap-2">
                  <input name="rider_commission_pct" type="number" min={0} max={100} step={0.5} defaultValue={config.rider_commission_bps / 100} className={`${compactInputClass} w-36`} />
                  <span className="text-xs text-muted">% of delivery fee</span>
                </div>
              </label>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Waiting & cancellation</h3>
            <div className="mt-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <NumberField label="Free waiting" name="free_waiting_mins" defaultValue={config.free_waiting_mins} suffix="min" />
              <NumberField label="Paid waiting" name="paid_waiting_per_min_tzs" defaultValue={config.paid_waiting_per_min_tzs} step={50} suffix="TZS/min" />
              <NumberField label="Cancellation fee" name="cancellation_fee_tzs" defaultValue={config.cancellation_fee_tzs} step={100} suffix="TZS" />
              <NumberField label="Cancellation grace" name="cancellation_grace_mins" defaultValue={config.cancellation_grace_mins} suffix="min" />
            </div>
          </div>

          <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save pricing"}</Button>
        </form>
      </Card>

      <Card aria-labelledby="surge">
        <h2 id="surge" className="font-semibold">Surge zones</h2>
        <p className="text-sm text-muted">Active zones raise the delivery fee by their multiplier (1.0–2.5×) and show customers a surge badge.</p>

        <ul className="mt-4 divide-y divide-line">
          {zones.length === 0 && <li className="py-3 text-sm text-muted">No surge zones yet.</li>}
          {zones.map((z) => (
            <li key={z.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <span className="font-medium">{z.zone_name}</span>
                <span className="ml-2 font-semibold tabular-nums">{Number(z.multiplier).toFixed(2)}×</span>
                {z.is_active ? <Badge tone="warning" className="ml-2">Active</Badge> : <Badge className="ml-2">Off</Badge>}
                {z.reason && <span className="block text-xs text-muted">{z.reason}</span>}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" disabled={busy} onClick={() => { const fd = new FormData(); fd.set("id", z.id); fd.set("active", String(!z.is_active)); run(() => setSurgeZoneActive(fd), z.is_active ? "Surge turned off." : "Surge turned on."); }}>
                  {z.is_active ? "Turn off" : "Turn on"}
                </Button>
                <Button variant="ghost" disabled={busy} onClick={() => { const fd = new FormData(); fd.set("id", z.id); run(() => deleteSurgeZone(fd), "Surge zone removed."); }}>
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>

        <form onSubmit={onAddZone} className="mt-4 grid items-end gap-3 sm:grid-cols-[1fr_8rem_1fr_auto]">
          <label className="block"><span className="text-sm font-medium">Zone name</span>
            <input name="zone_name" required className={`${compactInputClass} mt-1`} placeholder="Kariakoo market" /></label>
          <label className="block"><span className="text-sm font-medium">Multiplier</span>
            <input name="multiplier" type="number" min={1} max={2.5} step={0.1} defaultValue={1.5} className={`${compactInputClass} mt-1`} /></label>
          <label className="block"><span className="text-sm font-medium">Reason</span>
            <input name="reason" className={`${compactInputClass} mt-1`} placeholder="Peak hours / rain" /></label>
          <Button type="submit" disabled={busy}>Add zone</Button>
        </form>
      </Card>
    </div>
  );
}
