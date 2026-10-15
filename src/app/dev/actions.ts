"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DEMO_ROLE_COOKIE, DEMO_ROLE_PREVIEW_ENABLED } from "@/lib/auth/demo-mode";
import { isRole } from "@/lib/auth/session";
import type { Role } from "@/lib/types";

const home: Record<Role, string> = {
  customer: "/customer",
  seller: "/seller",
  rider: "/rider",
  admin: "/admin",
};

/** Development only: choose which demo identity to preview. */
export async function setDemoRole(formData: FormData) {
  if (!DEMO_ROLE_PREVIEW_ENABLED) throw new Error("Role preview is disabled in production.");
  const role = formData.get("role");
  if (!isRole(role)) throw new Error("Unknown role.");

  (await cookies()).set(DEMO_ROLE_COOKIE, role, {
    httpOnly: true, // not readable or writable by page JavaScript
    sameSite: "lax",
    secure: false, // local development runs on http://localhost
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  redirect(home[role]);
}

export async function clearDemoRole() {
  if (!DEMO_ROLE_PREVIEW_ENABLED) throw new Error("Role preview is disabled in production.");
  (await cookies()).delete(DEMO_ROLE_COOKIE);
  redirect("/dev");
}
