import { Phone, User } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { RoleSwitcher, SignOutButton } from "@/components/auth/AccountControls";
import { RoleGate } from "@/components/auth/RoleGate";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/States";
import { getDictionary } from "@/i18n/server";
import { getSessionWithRole } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatTzPhone } from "@/lib/validation/checkout";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).nav.account };
}
export const instant = false;

export default async function ProfilePage() {
  const t = await getDictionary();
  return <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t.nav.account}</h1>
    <Suspense fallback={<Skeleton className="mt-6 h-64" />}><RoleGate role="customer"><Profile /></RoleGate></Suspense>
  </div>;
}

async function Profile() {
  const t = await getDictionary();
  const p = t.profile;
  const session = await getSessionWithRole("customer");
  if (!session) return null;
  const sb = await createSupabaseServerClient();
  const { data, error } = await sb.from("profiles").select("full_name,phone").eq("id", session.userId).limit(1);
  if (error) throw new Error(`Could not load your account: ${error.message}`);
  const profile = (data?.[0] ?? null) as { full_name: string; phone: string | null } | null;

  return <div className="mt-6 space-y-5">
    <Card aria-labelledby="personal-heading">
      <CardHeader id="personal-heading" title={p.personalInfo} />
      <dl className="space-y-3 text-sm">
        <div className="flex gap-3"><User size={16} className="mt-0.5 text-brand-600" aria-hidden="true" /><div><dt className="text-muted">{p.name}</dt><dd className="font-medium">{profile?.full_name || session.displayName}</dd></div></div>
        {profile?.phone && <div className="flex gap-3"><Phone size={16} className="mt-0.5 text-brand-600" aria-hidden="true" /><div><dt className="text-muted">{p.phone}</dt><dd className="font-medium">{formatTzPhone(profile.phone)}</dd></div></div>}
      </dl>
    </Card>

    <Card aria-labelledby="addresses-heading">
      <CardHeader id="addresses-heading" title={p.deliveryAddresses} subtitle={p.addressesNote} />
      <ButtonLink href="/customer/orders" variant="outline">{p.viewOrders}</ButtonLink>
    </Card>

    {session.roles && session.roles.filter((role) => role !== "admin").length > 1 && <Card aria-labelledby="roles-heading"><CardHeader id="roles-heading" title={p.yourRoles} subtitle={p.rolesNote} /><RoleSwitcher roles={session.roles} active={session.role} /></Card>}
    <SignOutButton />
  </div>;
}
