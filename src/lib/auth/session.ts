import "server-only";

// Server-side identity. Every protected page and action asks this module
// "who is calling?". The browser never decides its own role.
//
// Phase 1: identity comes only from the development role-preview cookie
// (an httpOnly cookie set by a server action, ignored in production).
// Phase 2: identity will come from Supabase Auth, and roles from the
// `user_roles` table, which only admins can write.
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { cache } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/types";
import { ACTIVE_ROLE_COOKIE, pickActiveRole } from "./active-role";
import { DEMO_ROLE_COOKIE, DEMO_ROLE_PREVIEW_ENABLED } from "./demo-mode";

export interface Session {
  userId: string;
  role: Role;
  displayName: string;
  /** Set for customers. */
  customerId?: string;
  /** Set for sellers: the one shop they own. */
  shopId?: string;
  /** Set for riders. */
  riderId?: string;
  isDemo: boolean;
  /** Every role the real signed-in user holds (for the role switcher). */
  roles?: Role[];
}

export const ROLES: Role[] = ["customer", "seller", "rider", "admin"];

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as string[]).includes(value);
}

/** Fixed demo identities used by the development role preview. */
export const demoIdentities: Record<Role, Session> = {
  customer: { userId: "demo-user-customer", role: "customer", displayName: "Asha Mohamed", customerId: "cust-001", isDemo: true },
  seller: { userId: "demo-user-seller", role: "seller", displayName: "Msimbazi Mobile Hub", shopId: "shop-001", isDemo: true },
  rider: { userId: "demo-user-rider", role: "rider", displayName: "Hamisi Ally", riderId: "rider-001", isDemo: true },
  admin: { userId: "demo-user-admin", role: "admin", displayName: "Founder (demo)", isDemo: true },
};

/** Returns the caller's session, or null if not signed in. Cached per request. */
export const getSession = cache(async (): Promise<Session | null> => {
  // Always read the request's cookies, so pages that depend on the session
  // are rendered per request and never pre-generated at build time.
  const store = await cookies();

  // Real Supabase Auth takes priority over the development role preview.
  const real = await supabaseSession(store.get(ACTIVE_ROLE_COOKIE)?.value);
  if (real) return real;

  if (DEMO_ROLE_PREVIEW_ENABLED) {
    const value = store.get(DEMO_ROLE_COOKIE)?.value;
    if (isRole(value)) return demoIdentities[value];
  }
  return null;
});

/**
 * Build a Session from the signed-in Supabase user, or null when nobody is
 * signed in. Roles come from the user_roles table (admins cannot be minted
 * from the client); the owned shop and rider rows give the scoping ids.
 */
async function supabaseSession(preferredRole: string | undefined): Promise<Session | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const sb = await createSupabaseServerClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return null;

    const [{ data: roleRows }, { data: profileRows }, { data: shopRows }, { data: riderRows }] = await Promise.all([
      sb.from("user_roles").select("role").eq("user_id", user.id),
      sb.from("profiles").select("full_name").eq("id", user.id).limit(1),
      sb.from("shops").select("id").eq("owner_id", user.id).limit(1),
      sb.from("riders").select("id").eq("id", user.id).limit(1),
    ]);

    const roles = ((roleRows ?? []) as { role: unknown }[]).map((r) => r.role).filter(isRole);
    const active = pickActiveRole(roles, preferredRole);
    if (!active) return null;

    const name = String((profileRows?.[0] as { full_name?: string } | undefined)?.full_name ?? "").trim();
    const shopId = (shopRows?.[0] as { id?: string } | undefined)?.id;
    const riderId = (riderRows?.[0] as { id?: string } | undefined)?.id;

    return {
      userId: user.id,
      role: active,
      displayName: name || user.email || "KARIAKOO user",
      customerId: roles.includes("customer") ? user.id : undefined,
      shopId,
      riderId,
      isDemo: false,
      roles,
    };
  } catch {
    // Network / config hiccup: fall back to no real session.
    return null;
  }
}

export class AuthorizationError extends Error {
  constructor(message = "You do not have permission to do that.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

/** Throws unless the session exists and has the given role. */
export function assertRole(session: Session | null, role: Role): asserts session is Session {
  if (!session || session.role !== role) throw new AuthorizationError();
}

/** For server pages/actions: the session if it has `role`, else null. */
export async function getSessionWithRole(role: Role): Promise<Session | null> {
  const session = await getSession();
  return session?.role === role ? session : null;
}

/**
 * For protected pages. Next.js renders a layout and its page in parallel, so
 * a check in the layout alone does NOT stop page code from running: every
 * protected page must call this itself. Unauthorised callers get a 404.
 */
export async function requireRole(role: Role): Promise<Session> {
  const session = await getSessionWithRole(role);
  if (!session) notFound();
  return session;
}
