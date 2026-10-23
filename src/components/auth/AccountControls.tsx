// Account controls for a signed-in real user: switch between the roles they
// hold, and sign out. These are plain forms posting to server actions, so they
// work without client JavaScript.
import { setActiveRole, signOut } from "@/app/[lang]/(auth)/actions";
import { buttonClasses } from "@/components/ui/Button";
import type { Role } from "@/lib/types";

const roleLabel: Record<Role, string> = { customer: "Customer", seller: "Seller", rider: "Rider", admin: "Admin" };

export function SignOutButton({ variant = "outline" }: { variant?: "outline" | "ghost" | "glass" }) {
  return (
    <form action={signOut}>
      <button type="submit" className={buttonClasses({ variant })}>Sign out</button>
    </form>
  );
}

/** One button that switches the active role to `role` (used by RoleGate). */
export function SwitchToRoleButton({ role }: { role: Role }) {
  return (
    <form action={setActiveRole}>
      <input type="hidden" name="role" value={role} />
      <button type="submit" className={buttonClasses({ variant: "primary" })}>Switch to {roleLabel[role]}</button>
    </form>
  );
}

/** Pills for every role the user holds; the active one is highlighted. */
export function RoleSwitcher({ roles, active }: { roles: Role[]; active: Role }) {
  if (roles.length < 2) return null;
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Switch role">
      {roles.map((r) => (
        <form key={r} action={setActiveRole}>
          <input type="hidden" name="role" value={r} />
          <button
            type="submit"
            aria-pressed={r === active}
            className={`h-10 rounded-full px-4 text-sm font-semibold ${r === active ? "bg-brand-600 text-white" : "border border-line bg-white text-ink hover:border-brand-300"}`}
          >
            {roleLabel[r]}
          </button>
        </form>
      ))}
    </div>
  );
}
