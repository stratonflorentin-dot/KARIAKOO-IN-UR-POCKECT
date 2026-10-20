import "server-only";

// Live seller/rider applications for the admin area. This reads the
// application rows straight from Supabase and keeps their true UUIDs
// from Supabase and keeps their true UUIDs, because the admin moderation RPCs
// (admin_set_shop_status / admin_set_rider_status) key off those UUIDs.
//
// Access is as the signed-in admin, so the "admin reads all" RLS policies on
// shops / riders / profiles are what actually authorise these reads. Real
// applications are shops with is_demo = false (the apply_as_seller RPC inserts
// them so) and the authenticated applicant's rider row.
import { assertRole, type Session } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface ShopApplication {
  id: string;
  name: string;
  slug: string;
  category: string;
  area: string;
  address: string;
  status: string;
  verified: boolean;
  appliedAt: string;
}

export interface RiderApplication {
  id: string;
  name: string;
  phone: string | null;
  vehicle: string;
  plate: string;
  baseZone: string;
  status: string;
  appliedAt: string;
}

/** Seller applications (is_demo = false), newest first. */
export async function liveShopApplications(session: Session | null): Promise<ShopApplication[]> {
  assertRole(session, "admin");
  try {
    const sb = await createSupabaseServerClient();
    const { data, error } = await sb
      .from("shops")
      .select("id,name,slug,primary_category,area,address,status,verified,created_at")
      .eq("is_demo", false)
      .order("created_at", { ascending: false });
    if (error || !data) return [];
    return (data as Record<string, unknown>[]).map((r) => ({
      id: String(r.id),
      name: String(r.name ?? ""),
      slug: String(r.slug ?? ""),
      category: String(r.primary_category ?? ""),
      area: String(r.area ?? ""),
      address: String(r.address ?? ""),
      status: String(r.status ?? "pending"),
      verified: Boolean(r.verified),
      appliedAt: String(r.created_at ?? ""),
    }));
  } catch {
    return [];
  }
}

/** Real rider applications (every riders row is real), newest first. Empty on any error. */
export async function liveRiderApplications(session: Session | null): Promise<RiderApplication[]> {
  assertRole(session, "admin");
  try {
    const sb = await createSupabaseServerClient();
    const { data, error } = await sb
      .from("riders")
      .select("id,vehicle,plate,base_zone,status,created_at,profiles(full_name,phone)")
      .order("created_at", { ascending: false });
    if (error || !data) return [];
    return (data as Record<string, unknown>[]).map((r) => {
      const profile = (Array.isArray(r.profiles) ? r.profiles[0] : r.profiles) as { full_name?: string; phone?: string } | null;
      return {
        id: String(r.id),
        name: String(profile?.full_name ?? "").trim() || "Rider applicant",
        phone: profile?.phone ?? null,
        vehicle: String(r.vehicle ?? ""),
        plate: String(r.plate ?? ""),
        baseZone: String(r.base_zone ?? ""),
        status: String(r.status ?? "pending"),
        appliedAt: String(r.created_at ?? ""),
      };
    });
  } catch {
    return [];
  }
}
