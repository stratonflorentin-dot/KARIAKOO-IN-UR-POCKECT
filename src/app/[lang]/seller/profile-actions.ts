"use server";

import { revalidatePath, updateTag } from "next/cache";
import { getSessionWithRole } from "@/lib/auth/session";
import { storeBannerPublicPrefix } from "@/lib/storage";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

export async function saveSellerShopPhoto(imageUrl: string) {
  const session = await getSessionWithRole("seller");
  if (!session) return { ok: false as const, error: "Switch to your seller account to edit your shop photo." };
  const supabase = await createSupabaseServerClient();
  const { data: shop, error: shopError } = await supabase
    .from("shops")
    .select("id")
    .eq("owner_id", session.userId)
    .limit(1)
    .maybeSingle();
  if (shopError || !shop) return { ok: false as const, error: "Your shop could not be found." };

  const prefix = storeBannerPublicPrefix(getSupabasePublicEnv().url, shop.id);
  const objectName = imageUrl.startsWith(prefix) ? imageUrl.slice(prefix.length) : "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/i.test(objectName)) {
    return { ok: false as const, error: "That shop photo could not be verified. Please upload it again." };
  }

  const { data, error } = await supabase
    .from("shops")
    .update({ banner_url: imageUrl })
    .eq("id", shop.id)
    .eq("owner_id", session.userId)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false as const, error: error.message };
  if (!data) return { ok: false as const, error: "The shop photo could not be saved." };

  updateTag("public-catalog");
  revalidatePath("/[lang]/seller", "page");
  return { ok: true as const };
}
