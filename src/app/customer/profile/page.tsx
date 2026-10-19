import { MapPin, Phone, User } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { RoleSwitcher, SignOutButton } from "@/components/auth/AccountControls";
import { RoleGate } from "@/components/auth/RoleGate";
import { DemoTag } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Notice, Skeleton } from "@/components/ui/States";
import { DEMO_ROLE_PREVIEW_ENABLED } from "@/lib/auth/demo-mode";
import { getSessionWithRole } from "@/lib/auth/session";
import { customerProfile } from "@/lib/data/access";
import { getZone } from "@/lib/delivery";
import { formatDate } from "@/lib/format";
import { formatTzPhone } from "@/lib/validation/checkout";

export const metadata: Metadata = { title: "Account" };

// Every page in this area needs a signed-in session, so it is rendered per
// request. Opt out of build-time instant-navigation validation, which renders
// without a session (and would just see the access check's 404).
export const instant = false;

export default function ProfilePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Account</h1>
      <Suspense fallback={<Skeleton className="mt-6 h-64" />}>
        <RoleGate role="customer">
          <Profile />
        </RoleGate>
      </Suspense>
    </div>
  );
}

async function Profile() {
  const session = await getSessionWithRole("customer");
  const profile = customerProfile(session);
  const real = Boolean(session && !session.isDemo);

  return (
    <div className="mt-6 space-y-5">
      {profile ? (
        <>
          <Card aria-labelledby="personal-heading">
            <CardHeader id="personal-heading" title="Personal information" action={<DemoTag />} />
            <dl className="space-y-3 text-sm">
              <div className="flex gap-3"><User size={16} className="mt-0.5 text-brand-600" aria-hidden="true" /><div><dt className="text-muted">Name</dt><dd className="font-medium">{profile.name}</dd></div></div>
              <div className="flex gap-3"><Phone size={16} className="mt-0.5 text-brand-600" aria-hidden="true" /><div><dt className="text-muted">Phone</dt><dd className="font-medium">{formatTzPhone(profile.phone)}</dd></div></div>
            </dl>
            <p className="mt-3 text-xs text-muted">Customer since {formatDate(profile.joinedAt)}</p>
          </Card>

          <Card aria-labelledby="addresses-heading">
            <CardHeader id="addresses-heading" title="Saved addresses" />
            <ul className="space-y-3">
              {profile.addresses.map((a) => (
                <li key={a.label} className="flex gap-3 rounded-xl bg-subtle p-3 text-sm">
                  <MapPin size={16} className="mt-0.5 shrink-0 text-brand-600" aria-hidden="true" />
                  <span><strong className="font-semibold">{a.label}</strong><br />{a.address}, {getZone(a.zone).name}</span>
                </li>
              ))}
            </ul>
          </Card>
        </>
      ) : real && session ? (
        <Card aria-labelledby="personal-heading">
          <CardHeader id="personal-heading" title="Personal information" />
          <p className="flex gap-3 text-sm"><User size={16} className="mt-0.5 text-brand-600" aria-hidden="true" /><span><span className="text-muted">Signed in as</span><br /><strong className="font-medium">{session.displayName}</strong></span></p>
          <p className="mt-3 text-xs text-muted">Your saved addresses and order history appear here as you use KARIAKOO.</p>
        </Card>
      ) : null}

      {real && session?.roles && session.roles.length > 1 && (
        <Card aria-labelledby="roles-heading">
          <CardHeader id="roles-heading" title="Your roles" subtitle="Switch which account you're using." />
          <RoleSwitcher roles={session.roles} active={session.role} />
        </Card>
      )}

      {real ? (
        <SignOutButton />
      ) : (
        <>
          <Notice>Editing your details, account settings and secure sign-in arrive with real accounts in Phase 2.</Notice>
          {DEMO_ROLE_PREVIEW_ENABLED && <ButtonLink href="/dev" variant="outline">Switch demo role</ButtonLink>}
        </>
      )}
    </div>
  );
}
