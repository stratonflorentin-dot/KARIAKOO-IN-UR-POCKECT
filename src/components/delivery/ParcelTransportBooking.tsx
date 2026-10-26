"use client";

import { useState } from "react";
import Image from "next/image";
import { CheckCircle2, MessageCircle, Phone, ShieldCheck, X, MapPin, Clock } from "lucide-react";
import { ParcelVehicleSelector } from "./ParcelVehicleSelector";
import {
  calculateBoltTripPrice,
  type GroundTransportVehicle,
  type GroundTransportVehicleId,
} from "@/lib/parcel-transport";
import { formatTzs } from "@/lib/format";

interface RoutePreset {
  from: string;
  to: string;
  distanceKm: number;
  durationMin: number;
}

const PRESETS: RoutePreset[] = [
  { from: "Newland", to: "Moshi Bus Stand", distanceKm: 11.2, durationMin: 28 },
  { from: "Kariakoo (Mtaa wa Lumumba)", to: "Mbezi Luis Bus Terminal", distanceKm: 18.5, durationMin: 45 },
  { from: "Kariakoo Sokoni", to: "Mwenge / Sinza", distanceKm: 12.0, durationMin: 32 },
  { from: "Kariakoo (Msimbazi)", to: "Kariakoo & City Centre (Posta)", distanceKm: 3.5, durationMin: 14 },
  { from: "Kariakoo (Kongo St)", to: "Tegeta / Bunju", distanceKm: 28.0, durationMin: 65 },
];

// Mock driver pool – each driver has an avatar initial colour for the avatar ring
const DRIVERS = [
  { name: "Juma Rashidi",    phone: "0754 123 456", plate: "T 482 DXK",  color: "bg-sky-600",    pickupMin: 5  },
  { name: "Bakari Mussa",    phone: "0715 889 900", plate: "T 319 DZW",  color: "bg-violet-600", pickupMin: 8  },
  { name: "Salim Athumani",  phone: "0784 556 677", plate: "MC 892 BTA", color: "bg-amber-600",  pickupMin: 4  },
  { name: "Kassim Ally",     phone: "0762 334 455", plate: "T 901 EAB",  color: "bg-rose-600",   pickupMin: 11 },
];

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

export function ParcelTransportBooking({ userRole: _userRole = "customer" }: { userRole?: "customer" | "seller" }) {
  const [origin, setOrigin] = useState("Newland");
  const [destination, setDestination] = useState("Moshi Bus Stand");
  const [distanceKm, setDistanceKm] = useState(11.2);
  const [durationMin, setDurationMin] = useState(28);
  const [isEditingRoute, setIsEditingRoute] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<GroundTransportVehicleId>("pickup");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [confirmedBooking, setConfirmedBooking] = useState<{
    reference: string;
    vehicle: GroundTransportVehicle;
    costTzs: number;
    distanceKm: number;
    durationMin: number;
    driverName: string;
    driverPhone: string;
    plateNumber: string;
    driverColor: string;
    pickupMin: number;
  } | null>(null);

  function handleSelectVehicle(vehicle: GroundTransportVehicle) {
    setSelectedVehicleId(vehicle.id);
  }

  function handleConfirmBooking(vehicle: GroundTransportVehicle) {
    const trip = calculateBoltTripPrice(vehicle.id, distanceKm, durationMin);
    const driver = DRIVERS[Math.floor(Math.random() * DRIVERS.length)];
    const ref = `KK-TR-${Math.floor(100000 + Math.random() * 900000)}`;
    setConfirmedBooking({
      reference: ref,
      vehicle,
      costTzs: trip.totalFareTzs,
      distanceKm,
      durationMin,
      driverName: driver.name,
      driverPhone: driver.phone,
      plateNumber: driver.plate,
      driverColor: driver.color,
      pickupMin: driver.pickupMin,
    });
  }

  return (
    <div className="mx-auto max-w-xl">
      {/* Route edit modal / dropdown */}
      {isEditingRoute && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-sm font-bold text-ink">Badili Mahali pa Mzigo & Umbali</h3>
              <button
                type="button"
                onClick={() => setIsEditingRoute(false)}
                className="grid h-8 w-8 place-items-center rounded-full hover:bg-subtle text-muted"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-ink">Mzigo unachukuliwa wapi (Origin)</label>
                <div className="mt-1 flex items-center gap-2 rounded-xl border border-line bg-subtle px-3 py-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-600" />
                  <input
                    type="text"
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    placeholder="Mf. Kariakoo, Mtaa wa Lumumba"
                    className="w-full bg-transparent text-ink outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-ink">Mzigo unapelekwa wapi (Destination)</label>
                <div className="mt-1 flex items-center gap-2 rounded-xl border border-line bg-subtle px-3 py-2">
                  <span className="h-2 w-2 rounded-full bg-red-600" />
                  <input
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="Mf. Moshi Bus Stand au Mbezi Luis"
                    className="w-full bg-transparent text-ink outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-ink">Umbali uliokadiriwa (km)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    value={distanceKm}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 1;
                      setDistanceKm(val);
                      setDurationMin(Math.round(val * 2.5));
                    }}
                    className="mt-1 w-full rounded-xl border border-line bg-subtle px-3 py-2 text-ink outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-ink">Muda barabarani (dk)</label>
                  <input
                    type="number"
                    step="1"
                    min="5"
                    value={durationMin}
                    onChange={(e) => setDurationMin(Number(e.target.value) || 10)}
                    className="mt-1 w-full rounded-xl border border-line bg-subtle px-3 py-2 text-ink outline-none"
                  />
                </div>
              </div>

              <div>
                <p className="font-semibold text-ink mb-1.5">Njia maarufu za mizigo Dar es Salaam:</p>
                <div className="space-y-1.5">
                  {PRESETS.map((p) => (
                    <button
                      key={`${p.from}-${p.to}`}
                      type="button"
                      onClick={() => {
                        setOrigin(p.from);
                        setDestination(p.to);
                        setDistanceKm(p.distanceKm);
                        setDurationMin(p.durationMin);
                        setIsEditingRoute(false);
                      }}
                      className="flex w-full items-center justify-between rounded-xl border border-line p-2 text-left hover:bg-emerald-50 hover:border-emerald-300"
                    >
                      <div className="truncate pr-2">
                        <span className="block truncate">{p.from} → {p.to}</span>
                        <span className="text-3xs text-muted">{p.distanceKm} km • ~{p.durationMin} dk</span>
                      </div>
                      <span className="text-2xs font-bold text-emerald-800 shrink-0">Chagua</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsEditingRoute(false)}
              className="w-full rounded-2xl bg-brand-600 py-3 text-xs font-bold text-white hover:bg-brand-700"
            >
              Hifadhi Njia Hii
            </button>
          </div>
        </div>
      )}

      {/* Main Vehicle Selector Component with Bolt Pricing */}
      <ParcelVehicleSelector
        selectedVehicleId={selectedVehicleId}
        onSelectVehicle={handleSelectVehicle}
        origin={origin}
        destination={destination}
        distanceKm={distanceKm}
        durationMin={durationMin}
        onEditRoute={() => setIsEditingRoute(true)}
        paymentMethod={paymentMethod}
        onSelectPaymentMethod={setPaymentMethod}
        onConfirm={handleConfirmBooking}
        confirmLabel="Chagua Gari"
        showBottomBar={true}
      />

      {/* ── Bolt-style Booking Confirmation Sheet ── */}
      {confirmedBooking && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 animate-in fade-in">
          <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl overflow-hidden">

            {/* ── Top: ETA hero strip ── */}
            <div className="bg-emerald-800 px-6 pt-5 pb-6 text-white">
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xs font-semibold uppercase tracking-widest text-emerald-300">Dereva Amepangiwa</span>
                <button
                  type="button"
                  onClick={() => setConfirmedBooking(null)}
                  className="grid h-7 w-7 place-items-center rounded-full bg-white/15 hover:bg-white/25"
                  aria-label="Funga"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="flex items-end gap-4">
                <div>
                  <div className="flex items-baseline gap-1">
                    <Clock size={18} className="mb-0.5 text-emerald-300" />
                    <span className="text-4xl font-black tracking-tight">
                      {confirmedBooking.pickupMin}
                    </span>
                    <span className="text-lg font-semibold text-emerald-200">dk</span>
                  </div>
                  <p className="text-sm font-semibold text-emerald-100 mt-0.5">Wakati wa Kuchukua Mzigo</p>
                  <div className="mt-2 flex items-center gap-1.5 text-2xs text-emerald-300">
                    <MapPin size={12} />
                    <span className="truncate max-w-[200px]">{origin} → {destination}</span>
                  </div>
                </div>

                {/* Vehicle avatar on the right */}
                <div className="ml-auto shrink-0 rounded-2xl bg-white/15 p-2 w-20 h-14 flex items-center justify-center">
                  <Image
                    src={confirmedBooking.vehicle.imageUrl}
                    alt={confirmedBooking.vehicle.name}
                    width={80}
                    height={56}
                    className="h-full w-full object-contain drop-shadow"
                  />
                </div>
              </div>
            </div>

            {/* ── Driver card ── */}
            <div className="px-5 py-4 border-b border-line">
              <div className="flex items-center gap-3">
                {/* Avatar circle with initials + online dot */}
                <div className="relative shrink-0">
                  <div className={`grid h-14 w-14 place-items-center rounded-full text-white text-lg font-extrabold shadow-md ${confirmedBooking.driverColor}`}>
                    {initials(confirmedBooking.driverName)}
                  </div>
                  {/* Online presence dot */}
                  <span className="absolute bottom-0 right-0 h-4 w-4 rounded-full bg-emerald-500 border-2 border-white shadow-sm" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-ink">{confirmedBooking.driverName}</p>
                  {/* Plate number badge */}
                  <div className="mt-1 inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-stone-50 px-2 py-0.5">
                    <span className="text-2xs font-black tracking-widest text-ink">{confirmedBooking.plateNumber}</span>
                  </div>
                  <p className="mt-0.5 text-2xs text-muted">{confirmedBooking.vehicle.name} · Inafikia hivi karibuni</p>
                </div>

                {/* Verified badge */}
                <CheckCircle2 size={20} className="shrink-0 text-emerald-600" />
              </div>
            </div>

            {/* ── Trip summary ── */}
            <div className="px-5 py-3 space-y-2 text-xs border-b border-line">
              <div className="flex justify-between">
                <span className="text-muted">Aina ya Gari</span>
                <span className="font-semibold text-ink">{confirmedBooking.vehicle.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Uwezo</span>
                <span className="font-semibold text-emerald-900">{confirmedBooking.vehicle.capacitySummary}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Umbali</span>
                <span className="font-semibold text-ink">{confirmedBooking.distanceKm} km · ~{confirmedBooking.durationMin} dk</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-line/60">
                <span className="font-bold text-sm text-ink">Gharama ya Safari</span>
                <span className="text-base font-black text-emerald-900">{formatTzs(confirmedBooking.costTzs)}</span>
              </div>
              <p className="text-2xs font-mono text-muted">Ref: {confirmedBooking.reference}</p>
            </div>

            {/* ── Actions ── */}
            <div className="px-5 py-4 space-y-2.5">
              {/* Chat with driver */}
              <a
                href={`https://wa.me/255${confirmedBooking.driverPhone.replace(/^0/, "").replace(/\s+/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center gap-3 rounded-2xl border border-line bg-subtle px-4 py-3 text-sm font-semibold text-ink hover:bg-stone-100 transition"
              >
                <MessageCircle size={18} className="text-emerald-700 shrink-0" />
                Ongea na Dereva (WhatsApp)
              </a>

              {/* Call driver */}
              <a
                href={`tel:${confirmedBooking.driverPhone.replace(/\s+/g, "")}`}
                className="flex w-full items-center gap-3 rounded-2xl border border-line bg-subtle px-4 py-3 text-sm font-semibold text-ink hover:bg-stone-100 transition"
              >
                <Phone size={18} className="text-emerald-700 shrink-0" />
                Piga Simu Dereva
              </a>

              {/* Escrow notice */}
              <div className="flex items-start gap-2 text-2xs text-emerald-900 bg-emerald-50 border border-emerald-200 p-3 rounded-2xl">
                <ShieldCheck size={15} className="shrink-0 text-emerald-600 mt-0.5" />
                <span>Malipo yanalindwa na Kariakoo Escrow — yatathibitishwa tu baada ya mzigo kufika salama.</span>
              </div>

              <button
                type="button"
                onClick={() => setConfirmedBooking(null)}
                className="w-full rounded-2xl bg-ink py-3.5 text-sm font-bold text-white hover:bg-stone-900 transition"
              >
                Funga na Fuatilia Safari
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
