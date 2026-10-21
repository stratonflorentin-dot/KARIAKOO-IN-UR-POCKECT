"use server";

// Admin moderation of real seller/rider applications. These call the tested
// admin_set_shop_status / admin_set_rider_status RPCs, which (as SECURITY
// DEFINER) re-check private.has_role('admin') and write an audit_logs row with
// the actor and the new status — so authorisation lives in the database, not
// in this action. We still gate here (defence in depth) and validate the
// target status against the real enums before calling.
import { revalidatePath } from "next/cache";
import { getSessionWithRole } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface ModerationResult {
  status: "idle" | "ok" | "error";
  message?: string;
}

const SHOP_STATUSES = new Set(["pending", "approved", "rejected", "suspended"]);
const RIDER_STATUSES = new Set(["pending", "approved", "rejected", "suspended"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function moderateApplication(_prev: ModerationResult, formData: FormData): Promise<ModerationResult> {
  const kind = String(formData.get("kind") ?? "");
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");

  const admin = await getSessionWithRole("admin");
  if (!admin) return { status: "error", message: "Only a signed-in admin can moderate applications." };
  if (!UUID.test(id)) return { status: "error", message: "That application id is not valid." };

  const sb = await createSupabaseServerClient();
  if (kind === "shop") {
    if (!SHOP_STATUSES.has(status)) return { status: "error", message: "Unknown status." };
    const { error } = await sb.rpc("admin_set_shop_status", { p_shop: id, p_status: status });
    if (error) return { status: "error", message: error.message };
    revalidatePath("/[lang]/admin/shops", "page");
    return { status: "ok" };
  }
  if (kind === "rider") {
    if (!RIDER_STATUSES.has(status)) return { status: "error", message: "Unknown status." };
    const { error } = await sb.rpc("admin_set_rider_status", { p_rider: id, p_status: status });
    if (error) return { status: "error", message: error.message };
    revalidatePath("/[lang]/admin/riders", "page");
    return { status: "ok" };
  }
  return { status: "error", message: "Unknown application type." };
}
