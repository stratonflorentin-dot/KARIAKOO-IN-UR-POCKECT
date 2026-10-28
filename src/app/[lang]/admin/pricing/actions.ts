"use server";

// Admin pricing controls. All writes go through the pricing_configs /
// surge_zones RLS admin policies — the database is the authority. Commission is
// stored in basis points; the form sends percentages, converted here.
import { revalidatePath } from "next/cache";
import { getSessionWithRole } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function intField(fd: FormData, name: string, { min = 0, max = 50_000_000 }: { min?: number; max?: number } = {}): number | null {
  const v = Math.round(Number(fd.get(name)));
  if (!Number.isFinite(v) || v < min || v > max) return null;
  return v;
}

/** Percentage (e.g. "12.5") → basis points (1250). 0–100% only. */
function pctToBps(fd: FormData, name: string): number | null {
  const pct = Number(fd.get(name));
  if (!Number.isFinite(pct) || pct < 0 || pct > 100) return null;
  return Math.round(pct * 100);
}

export async function savePricingConfig(formData: FormData): Promise<ActionResult> {
  const session = await getSessionWithRole("admin");
  if (!session) return { ok: false, error: "Only admins can change pricing." };

  const baseFare = intField(formData, "base_fare_tzs");
  const perKm = intField(formData, "per_km_rate_tzs");
  const perMin = intField(formData, "per_min_rate_tzs");
  const minFare = intField(formData, "minimum_fare_tzs");
  const booking = intField(formData, "booking_fee_tzs");
  const sellerBps = pctToBps(formData, "seller_commission_pct");
  const riderBps = pctToBps(formData, "rider_commission_pct");
  const freeWait = intField(formData, "free_waiting_mins", { max: 120 });
  const paidWait = intField(formData, "paid_waiting_per_min_tzs");
  const cancelFee = intField(formData, "cancellation_fee_tzs");
  const cancelGrace = intField(formData, "cancellation_grace_mins", { max: 120 });

  const values = { baseFare, perKm, perMin, minFare, booking, sellerBps, riderBps, freeWait, paidWait, cancelFee, cancelGrace };
  if (Object.values(values).some((v) => v === null)) {
    return { ok: false, error: "Check the values: TZS amounts must be 0 or more and percentages 0–100." };
  }

  const sb = await createSupabaseServerClient();
  const { error } = await sb
    .from("pricing_configs")
    .update({
      base_fare_tzs: baseFare,
      per_km_rate_tzs: perKm,
      per_min_rate_tzs: perMin,
      minimum_fare_tzs: minFare,
      booking_fee_tzs: booking,
      seller_commission_bps: sellerBps,
      rider_commission_bps: riderBps,
      free_waiting_mins: freeWait,
      paid_waiting_per_min_tzs: paidWait,
      cancellation_fee_tzs: cancelFee,
      cancellation_grace_mins: cancelGrace,
      updated_by: session.userId,
      updated_at: new Date().toISOString(),
    })
    .eq("is_active", true);
  if (error) return { ok: false, error: "Could not save pricing. Please try again." };

  revalidatePath("/[lang]/admin/pricing", "page");
  return { ok: true };
}

export async function addSurgeZone(formData: FormData): Promise<ActionResult> {
  const session = await getSessionWithRole("admin");
  if (!session) return { ok: false, error: "Only admins can change surge pricing." };

  const zoneName = String(formData.get("zone_name") ?? "").trim();
  const multiplier = Number(formData.get("multiplier"));
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 200);
  if (zoneName.length < 2 || zoneName.length > 60) return { ok: false, error: "Enter a zone name (2–60 characters)." };
  if (!Number.isFinite(multiplier) || multiplier < 1.0 || multiplier > 2.5) return { ok: false, error: "Multiplier must be between 1.0 and 2.5." };

  const sb = await createSupabaseServerClient();
  const { error } = await sb.from("surge_zones").insert({
    zone_name: zoneName,
    multiplier,
    reason,
    is_active: formData.get("is_active") === "on",
    updated_by: session.userId,
  });
  if (error) return { ok: false, error: "Could not add the surge zone." };
  revalidatePath("/[lang]/admin/pricing", "page");
  return { ok: true };
}

export async function setSurgeZoneActive(formData: FormData): Promise<ActionResult> {
  const session = await getSessionWithRole("admin");
  if (!session) return { ok: false, error: "Only admins can change surge pricing." };
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) return { ok: false, error: "Unknown surge zone." };
  const active = formData.get("active") === "true";

  const sb = await createSupabaseServerClient();
  const { error } = await sb
    .from("surge_zones")
    .update({ is_active: active, updated_by: session.userId, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: "Could not update the surge zone." };
  revalidatePath("/[lang]/admin/pricing", "page");
  return { ok: true };
}

export async function deleteSurgeZone(formData: FormData): Promise<ActionResult> {
  const session = await getSessionWithRole("admin");
  if (!session) return { ok: false, error: "Only admins can change surge pricing." };
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) return { ok: false, error: "Unknown surge zone." };

  const sb = await createSupabaseServerClient();
  const { error } = await sb.from("surge_zones").delete().eq("id", id);
  if (error) return { ok: false, error: "Could not remove the surge zone." };
  revalidatePath("/[lang]/admin/pricing", "page");
  return { ok: true };
}
