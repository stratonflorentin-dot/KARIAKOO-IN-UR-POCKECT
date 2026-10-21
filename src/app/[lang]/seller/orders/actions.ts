"use server";

import { revalidatePath } from "next/cache";
import { getSessionWithRole } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface SellerFulfillmentState {
  status: "idle" | "error" | "success";
  message?: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TO = new Set(["accepted", "rejected", "preparing", "ready_for_pickup"]);

export async function updateSellerFulfillment(_prev: SellerFulfillmentState, formData: FormData): Promise<SellerFulfillmentState> {
  const session = await getSessionWithRole("seller");
  if (!session) return { status: "error", message: "Please sign in as a seller." };

  const orderId = String(formData.get("orderId") ?? "");
  const to = String(formData.get("to") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!UUID.test(orderId) || !TO.has(to)) return { status: "error", message: "This order action is invalid." };
  if (to === "rejected" && (reason.length < 3 || reason.length > 250)) {
    return { status: "error", message: "Enter a rejection reason between 3 and 250 characters." };
  }

  const sb = await createSupabaseServerClient();
  const { error } = await sb.rpc("seller_update_fulfillment", {
    p_order: orderId,
    p_to: to,
    p_reason: to === "rejected" ? reason : null,
  });
  if (error) return { status: "error", message: "That order could not be updated. Refresh the page and try again." };

  revalidatePath("/[lang]/seller/orders", "page");
  revalidatePath("/[lang]/seller", "page");
  revalidatePath("/[lang]/seller/finances", "page");
  return { status: "success", message: to === "rejected" ? "Order rejected." : "Order status updated." };
}
