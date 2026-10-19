import type { Role } from "@/lib/types";

/** Cookie that remembers which role a multi-role user is currently acting as. */
export const ACTIVE_ROLE_COOKIE = "kk_active_role";

// When a user holds several roles, this order decides the default active one.
const PRIORITY: Role[] = ["admin", "seller", "rider", "customer"];

/**
 * Choose the active role from the roles a user holds: their saved preference
 * when they still hold it, otherwise the highest-priority role they have.
 */
export function pickActiveRole(roles: Role[], preferred?: string): Role | null {
  if (roles.length === 0) return null;
  if (preferred && roles.includes(preferred as Role)) return preferred as Role;
  for (const r of PRIORITY) if (roles.includes(r)) return r;
  return roles[0];
}
