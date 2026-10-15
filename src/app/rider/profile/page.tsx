import { BadgeCheck, Bike, LifeBuoy, MapPin, Phone, Star } from "lucide-react";
import type { Metadata } from "next";
import { DemoTag } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Notice } from "@/components/ui/States";
import { DEMO_ROLE_PREVIEW_ENABLED } from "@/lib/auth/demo-mode";
import { requireRole } from "@/lib/auth/session";
import { riderProfile } from "@/lib/data/access";
import { getZone } from "@/lib/delivery";
import { formatDate } from "@/lib/format";
import { formatTzPhone } from "@/lib/validation/checkout";

export const metadata: Metadata = { title: "Profile" };

export default async function RiderProfilePage() {
  const rider = riderProfile(await requireRole("rider"));
  if (!rider) return null;
  const row = "flex items-center gap-3 rounded-2xl bg-white p-4 text-sm";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{rider.name}</h1>
        <DemoTag />
      </div>
      <p className={row}><BadgeCheck className="text-emerald-700" aria-hidden="true" /> Verification: <strong className="capitalize">{rider.status}</strong></p>
      <p className={row}><Phone className="text-brand-600" aria-hidden="true" /> {formatTzPhone(rider.phone)}</p>
      <p className={row}><Bike className="text-brand-600" aria-hidden="true" /> {rider.vehicle} · {rider.plate}</p>
      <p className={row}><MapPin className="text-brand-600" aria-hidden="true" /> Base area: {getZone(rider.baseZone).name}</p>
      <p className={row}><Star className="fill-brand-500 text-brand-500" aria-hidden="true" /> Rating {rider.rating.toFixed(1)} · riding since {formatDate(rider.joinedAt)}</p>
      <Notice>
        <span className="flex gap-2"><LifeBuoy size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          Registration documents, problem reports and support chat arrive in Phase 6. Location sharing will always be opt-in.</span>
      </Notice>
      {DEMO_ROLE_PREVIEW_ENABLED && <ButtonLink href="/dev" variant="outline" full>Switch demo role</ButtonLink>}
    </div>
  );
}
