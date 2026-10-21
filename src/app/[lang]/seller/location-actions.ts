"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function saveSellerShopLocation(lat: number | null, lng: number | null) {
  await requireRole("seller");
  if ((lat === null) !== (lng === null)) throw new Error("Provide both coordinates or clear the location.");
  if (lat !== null && (!Number.isFinite(lat) || lat < -90 || lat > 90)) throw new Error("Latitude is out of range.");
  if (lng !== null && (!Number.isFinite(lng) || lng < -180 || lng > 180)) throw new Error("Longitude is out of range.");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("seller_set_shop_location", { p_lat: lat, p_lng: lng });
  if (error) throw new Error(`Could not save shop location: ${error.message}`);
  revalidatePath("/", "layout");
  return { ok: true };
}
