import type { Metadata } from "next";
import Link from "@/components/i18n/Link";
import { ParcelTransportBooking } from "@/components/delivery/ParcelTransportBooking";
import { Truck } from "lucide-react";

export const metadata: Metadata = {
  title: "Usafiri wa Mizigo — Kariakoo Ground Logistics",
  description: "Chagua usafiri wa ardhini kwa ajili ya vifurushi na mizigo yako: Pickup Ndogo, Bajaji ya Mizigo, Pikipiki au Lori Dogo.",
};

export default function ParcelTransportPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      {/* Breadcrumb & Title */}
      <div className="mb-4">
        <Link href="/customer" className="text-xs font-semibold text-brand-700 hover:underline">
          ← Nyumbani
        </Link>
        <div className="mt-2 flex items-center gap-2.5">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-100 text-emerald-800">
            <Truck size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
              Usafiri wa Mizigo (Ground Parcel Transport)
            </h1>
            <p className="text-xs text-muted">
              Chagua aina ya gari itakayobeba mzigo wako kutoka Kariakoo hadi eneo lako au kituo cha basi.
            </p>
          </div>
        </div>
      </div>

      <ParcelTransportBooking userRole="customer" />
    </div>
  );
}
