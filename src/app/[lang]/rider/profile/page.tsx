import { BadgeCheck, Bike, LifeBuoy, MapPin, Phone } from "lucide-react";
import type { Metadata } from "next";
import { Notice } from "@/components/ui/States";
import { RoleSwitcher, SignOutButton } from "@/components/auth/AccountControls";
import { requireRole } from "@/lib/auth/session";
import { riderProfile } from "@/lib/data/rider-live";
import { getZone } from "@/lib/delivery";
import { formatDate } from "@/lib/format";
import { formatTzPhone } from "@/lib/validation/checkout";

export const metadata: Metadata = { title: "Profile" };

export default async function RiderProfilePage() {
  const session = await requireRole("rider");
  const rider = await riderProfile(session);
  if (!rider) return <div className="space-y-4 rounded-2xl bg-white p-4 text-sm text-muted">
    <p>Rider profile details are not available yet.</p>
    {session.roles && session.roles.filter((item) => item !== "admin").length > 1 && <RoleSwitcher roles={session.roles} active={session.role} />}
    <SignOutButton />
  </div>;
  const row = "flex items-center gap-3 rounded-2xl bg-white p-4 text-sm";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{rider.name}</h1>
      </div>
      <p className={row}><BadgeCheck className="text-emerald-700" aria-hidden="true" /> Verification: <strong className="capitalize">{rider.status}</strong></p>
      <p className={row}><Phone className="text-brand-600" aria-hidden="true" /> {formatTzPhone(rider.phone)}</p>
      <p className={row}><Bike className="text-brand-600" aria-hidden="true" /> {rider.vehicle} · {rider.plate}</p>
      <p className={row}><MapPin className="text-brand-600" aria-hidden="true" /> Base area: {getZone(rider.baseZone).name}</p>
      <p className={row}>Riding since {formatDate(rider.joinedAt)}</p>
      <Notice>
        <span className="flex gap-2"><LifeBuoy size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          Registration documents and problem reporting are not available from this profile. Location sharing remains opt-in.</span>
      </Notice>
      {session.roles && session.roles.filter((item) => item !== "admin").length > 1 && <section className="rounded-2xl bg-white p-4">
        <h2 className="mb-3 font-semibold">Switch account area</h2>
        <RoleSwitcher roles={session.roles} active={session.role} />
      </section>}
      <SignOutButton />
    </div>
  );
}
