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

export interface AdminActionResult { status: "idle" | "ok" | "error"; message?: string }

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

export async function recordAdminPayment(_prev: AdminActionResult, formData: FormData): Promise<AdminActionResult> {
  const admin = await getSessionWithRole("admin");
  if (!admin) return { status: "error", message: "An admin session is required." };
  const orderId = String(formData.get("orderId") ?? "");
  const provider = String(formData.get("provider") ?? "");
  const kind = String(formData.get("kind") ?? "");
  const amount = Number(formData.get("amount") ?? NaN);
  const reference = String(formData.get("reference") ?? "").trim().slice(0, 160);
  const note = String(formData.get("note") ?? "").trim().slice(0, 500);
  if (!UUID.test(orderId)) return { status: "error", message: "Choose a valid order." };
  if (!["mpesa", "mixx", "airtelmoney", "halopesa", "cod"].includes(provider)) return { status: "error", message: "Choose a supported payment provider." };
  if (!["initiated", "succeeded", "failed", "refunded", "cod_collected"].includes(kind)) return { status: "error", message: "Choose a valid ledger event." };
  if (!Number.isSafeInteger(amount) || amount < 0 || amount > 1_000_000_000_000) return { status: "error", message: "Enter a valid TSh amount." };
  if (!note) return { status: "error", message: "Add a reconciliation note for the audit trail." };
  const sb = await createSupabaseServerClient();
  const { error } = await sb.rpc("record_payment_transaction", {
    p_order: orderId, p_provider: provider, p_kind: kind, p_amount: amount,
    p_provider_ref: reference || null, p_note: note, p_payload: {},
  });
  if (error) return { status: "error", message: error.message };
  revalidatePath("/[lang]/admin/payments", "page");
  revalidatePath("/[lang]/admin/orders", "page");
  return { status: "ok", message: "Payment event recorded in the immutable ledger." };
}

export async function updateAdminIncident(_prev: AdminActionResult, formData: FormData): Promise<AdminActionResult> {
  const admin = await getSessionWithRole("admin");
  if (!admin) return { status: "error", message: "An admin session is required." };
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!UUID.test(id) || !["acknowledged", "resolved"].includes(status)) return { status: "error", message: "Invalid incident update." };
  const sb = await createSupabaseServerClient();
  const { error } = await sb.rpc("admin_update_incident", { p_id: id, p_status: status, p_note: null });
  if (error) return { status: "error", message: error.message };
  revalidatePath("/[lang]/admin/disputes", "page");
  return { status: "ok", message: `Incident ${status}.` };
}

export async function settleRiderDay(_prev: AdminActionResult, formData: FormData): Promise<AdminActionResult> {
  const admin = await getSessionWithRole("admin");
  if (!admin) return { status: "error", message: "An admin session is required." };
  const riderId = String(formData.get("riderId") ?? "");
  const date = String(formData.get("date") ?? "");
  if (!UUID.test(riderId) || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(`${date}T00:00:00Z`))) return { status: "error", message: "Choose a valid rider and delivery date." };
  const sb = await createSupabaseServerClient();
  const { error } = await sb.rpc("admin_settle_rider_day", { p_rider: riderId, p_date: date });
  if (error) return { status: "error", message: error.message };
  revalidatePath("/[lang]/admin/delivery", "page");
  return { status: "ok", message: "Rider settlement created." };
}

export async function markSettlementPaid(_prev: AdminActionResult, formData: FormData): Promise<AdminActionResult> {
  const admin = await getSessionWithRole("admin");
  if (!admin) return { status: "error", message: "An admin session is required." };
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) return { status: "error", message: "Invalid settlement." };
  const sb = await createSupabaseServerClient();
  const { error } = await sb.rpc("admin_mark_settlement_paid", { p_id: id });
  if (error) return { status: "error", message: error.message };
  revalidatePath("/[lang]/admin/delivery", "page");
  return { status: "ok", message: "Settlement marked paid." };
}
