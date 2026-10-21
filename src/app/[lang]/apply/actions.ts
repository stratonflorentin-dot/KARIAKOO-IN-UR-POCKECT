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
import { localizePath } from "@/i18n/config";
import { dictionaryFor } from "@/i18n/dictionaries";
import { getRequestLocale } from "@/i18n/server";
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

type ApplyErrors = ReturnType<typeof dictionaryFor>["apply"]["errors"];

/** Map the RPC's raised errors (by SQLSTATE where we can) to plain guidance. */
function friendlyRpcError(code: string | undefined, message: string, e: ApplyErrors): string {
  if (code === "42501") return e.signInFirst;
  if (code === "23503") return e.validCategory;
  if (code === "23514") return message; // our own "required" messages are already clear
  return e.generic;
}

/** The current user must have an authenticated Supabase session. */
async function requireRealUser(): Promise<string | null> {
  const session = await getSession();
  if (!session) return null;
  return session.userId;
}

export async function applyAsSeller(_prev: ApplyState, formData: FormData): Promise<ApplyState> {
  const locale = await getRequestLocale();
  const e = dictionaryFor(locale).apply.errors;
  const values = {
    name: String(formData.get("name") ?? "").trim(),
    category: String(formData.get("category") ?? "").trim(),
    area: String(formData.get("area") ?? "").trim(),
    address: String(formData.get("address") ?? "").trim(),
  };

  if (!(await requireRealUser())) {
    return { status: "error", message: e.signInToApply, values };
  }

  const errors: Record<string, string> = {};
  if (values.name.length < 2) errors.name = e.enterShopName;
  if (!getCategories().some((c) => c.slug === values.category)) errors.category = e.chooseCategoryErr;
  if (!SHOP_AREAS.some((a) => a.id === values.area)) errors.area = e.chooseAreaErr;
  if (values.address.length < 3) errors.address = e.enterAddress;
  if (Object.keys(errors).length > 0) return { status: "error", errors, values };

  const sb = await createSupabaseServerClient();
  const { error } = await sb.rpc("apply_as_seller", {
    p_name: values.name,
    p_category: values.category,
    p_area: values.area,
    p_address: values.address,
  });
  if (error) {
    return { status: "error", message: friendlyRpcError(error.code, error.message, e), values };
  }

  // Grant takes effect immediately; switch the active role so they land on
  // their (pending) seller area and can see their application status.
  (await cookies()).set(ACTIVE_ROLE_COOKIE, "seller", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  redirect(localizePath(locale, "/seller"));
}

export async function applyAsRider(_prev: ApplyState, formData: FormData): Promise<ApplyState> {
  const locale = await getRequestLocale();
  const e = dictionaryFor(locale).apply.errors;
  const values = {
    vehicle: String(formData.get("vehicle") ?? "").trim(),
    plate: String(formData.get("plate") ?? "").trim(),
    base_zone: String(formData.get("base_zone") ?? "").trim(),
  };

  if (!(await requireRealUser())) {
    return { status: "error", message: e.signInToApply, values };
  }

  const errors: Record<string, string> = {};
  if (values.vehicle.length < 2) errors.vehicle = e.enterVehicle;
  if (values.plate.length < 2) errors.plate = e.enterPlate;
  if (!deliveryZones.some((z) => z.id === values.base_zone)) errors.base_zone = e.chooseWorkArea;
  if (Object.keys(errors).length > 0) return { status: "error", errors, values };

  const sb = await createSupabaseServerClient();
  const { error } = await sb.rpc("apply_as_rider", {
    p_vehicle: values.vehicle,
    p_plate: values.plate,
    p_base_zone: values.base_zone,
  });
  if (error) {
    return { status: "error", message: friendlyRpcError(error.code, error.message, e), values };
  }

  (await cookies()).set(ACTIVE_ROLE_COOKIE, "rider", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  redirect(localizePath(locale, "/rider"));
}
