import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/Card";
import { Notice } from "@/components/ui/States";
import { PricingControls, type PricingConfigRow, type SurgeZoneRow } from "@/components/dashboard/PricingControls";
import { requireRole } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Pricing & fares" };

export default async function AdminPricingPage() {
  await requireRole("admin");
  const sb = await createSupabaseServerClient();
  const [cfgRes, zonesRes] = await Promise.all([
    sb.from("pricing_configs").select("*").eq("is_active", true).maybeSingle(),
    sb.from("surge_zones").select("id,zone_name,multiplier,is_active,reason").order("updated_at", { ascending: false }),
  ]);
  if (cfgRes.error) throw new Error(`Could not load pricing config: ${cfgRes.error.message}`);
  if (zonesRes.error) throw new Error(`Could not load surge zones: ${zonesRes.error.message}`);

  const config = cfgRes.data as PricingConfigRow | null;
  const zones = (zonesRes.data ?? []) as SurgeZoneRow[];

  return (
    <>
      <PageHeader
        title="Pricing & fares"
        description="Delivery fare rates, platform commission and surge multipliers. Commission is visible to admins only; customers see fares and the surge badge."
      />
      {config ? (
        <PricingControls config={config} zones={zones} />
      ) : (
        <Notice tone="warning">No active pricing configuration found in the database.</Notice>
      )}
    </>
  );
}
