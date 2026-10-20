"use server";

// Becoming a seller or a rider. A signed-in customer applies here; the
// apply_as_seller / apply_as_rider RPCs (SECURITY DEFINER) grant the role and
// create a PENDING shop/rider row. The role grant alone does not make them
// live — an admin must approve before customers or dispatch can see them.
//
// Everything arriving here is untrusted: we validate shape server-side, but
// the RPCs are the real authority (they re-check auth.uid() and the category),
// and user_roles has no client write policy, so the role can only be granted
// through this trusted path.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ACTIVE_ROLE_COOKIE } from "@/lib/auth/active-role";
import { getSession } from "@/lib/auth/session";
import { getCategories } from "@/lib/catalog";
import { deliveryZones } from "@/lib/delivery";
import { SHOP_AREAS } from "@/lib/shop-areas";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface ApplyState {
  status: "idle" | "error";
  message?: string;
  errors?: Record<string, string>;
  values?: Record<string, string>;
}

/** Map the RPC's raised errors (by SQLSTATE where we can) to plain guidance. */
function friendlyRpcError(code: string | undefined, message: string): string {
  if (code === "42501") return "Please sign in first, then apply.";
  if (code === "23503") return "Please choose a valid category.";
  if (code === "23514") return message; // our own "required" messages are already clear
  return "Something went wrong submitting your application. Please try again.";
}

/** The current user must be signed in for real (not the dev role preview). */
async function requireRealUser(): Promise<string | null> {
  const session = await getSession();
  if (!session || session.isDemo) return null;
  return session.userId;
}

export async function applyAsSeller(_prev: ApplyState, formData: FormData): Promise<ApplyState> {
  const values = {
    name: String(formData.get("name") ?? "").trim(),
    category: String(formData.get("category") ?? "").trim(),
    area: String(formData.get("area") ?? "").trim(),
    address: String(formData.get("address") ?? "").trim(),
  };

  if (!(await requireRealUser())) {
    return { status: "error", message: "Please sign in to apply.", values };
  }

  const errors: Record<string, string> = {};
  if (values.name.length < 2) errors.name = "Enter your shop or business name.";
  if (!getCategories().some((c) => c.slug === values.category)) errors.category = "Choose the category you mostly sell.";
  if (!SHOP_AREAS.some((a) => a.id === values.area)) errors.area = "Choose your trading area.";
  if (values.address.length < 3) errors.address = "Enter your street, building or landmark.";
  if (Object.keys(errors).length > 0) return { status: "error", errors, values };

  const sb = await createSupabaseServerClient();
  const { error } = await sb.rpc("apply_as_seller", {
    p_name: values.name,
    p_category: values.category,
    p_area: values.area,
    p_address: values.address,
  });
  if (error) {
    return { status: "error", message: friendlyRpcError(error.code, error.message), values };
  }

  // Grant takes effect immediately; switch the active role so they land on
  // their (pending) seller area and can see their application status.
  (await cookies()).set(ACTIVE_ROLE_COOKIE, "seller", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  redirect("/seller");
}

export async function applyAsRider(_prev: ApplyState, formData: FormData): Promise<ApplyState> {
  const values = {
    vehicle: String(formData.get("vehicle") ?? "").trim(),
    plate: String(formData.get("plate") ?? "").trim(),
    base_zone: String(formData.get("base_zone") ?? "").trim(),
  };

  if (!(await requireRealUser())) {
    return { status: "error", message: "Please sign in to apply.", values };
  }

  const errors: Record<string, string> = {};
  if (values.vehicle.length < 2) errors.vehicle = "Tell us what you ride (e.g. Motorbike, Bajaji).";
  if (values.plate.length < 2) errors.plate = "Enter your number plate.";
  if (!deliveryZones.some((z) => z.id === values.base_zone)) errors.base_zone = "Choose the area you usually work in.";
  if (Object.keys(errors).length > 0) return { status: "error", errors, values };

  const sb = await createSupabaseServerClient();
  const { error } = await sb.rpc("apply_as_rider", {
    p_vehicle: values.vehicle,
    p_plate: values.plate,
    p_base_zone: values.base_zone,
  });
  if (error) {
    return { status: "error", message: friendlyRpcError(error.code, error.message), values };
  }

  (await cookies()).set(ACTIVE_ROLE_COOKIE, "rider", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  redirect("/rider");
}
