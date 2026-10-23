import { Lock } from "lucide-react";
import type { ReactNode } from "react";
import { SignOutButton, SwitchToRoleButton } from "@/components/auth/AccountControls";
import { ButtonLink } from "@/components/ui/Button";
import { getSession } from "@/lib/auth/session";
import { getLocale } from "@/i18n/server";
import { redirect } from "next/navigation";
import type { Role } from "@/lib/types";

const roleName: Record<Role, string> = { customer: "customer", seller: "business owner", rider: "rider", admin: "admin" };

/**
 * Server-side gate for a role's area. Renders children only when the
 * server-side session has the required role. Hiding links is not security;
 * this check runs on the server for every request.
 */
export async function RoleGate({ role, children }: { role: Role; children: ReactNode }) {
  const session = await getSession();
  if (session?.role === role) return <>{children}</>;
  if (role === "admin" && !session) redirect(`/${await getLocale()}/staff`);

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-night text-brand-400">
        <Lock aria-hidden="true" />
      </div>
      <h1 className="mt-5 text-2xl font-bold tracking-tight">This area is for {roleName[role]}s</h1>
      {session ? (
        <>
          <p className="mt-2 text-muted">
            You are signed in as {roleName[session.role]}.{" "}
            {session.roles?.includes(role)
              ? `Switch to your ${roleName[role]} role to view this area.`
              : `Apply for a ${roleName[role]} account to access it.`}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            {session.roles?.includes(role) ? <SwitchToRoleButton role={role} /> : <ButtonLink href="/welcome">Explore roles</ButtonLink>}
            <SignOutButton />
          </div>
        </>
      ) : (
        <>
          <p className="mt-2 text-muted">Please sign in to continue.</p>
          <ButtonLink href="/sign-in" className="mt-6">Sign in</ButtonLink>
        </>
      )}
    </div>
  );
}
