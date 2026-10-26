"use client";

import { useState } from "react";
import { CheckCircle2, Phone, ShieldCheck, X } from "lucide-react";
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
  } | null>(null);

  function handleSelectVehicle(vehicle: GroundTransportVehicle) {
    setSelectedVehicleId(vehicle.id);
  }

  function handleConfirmBooking(vehicle: GroundTransportVehicle) {
    const trip = calculateBoltTripPrice(vehicle.id, distanceKm, durationMin);
    const drivers = [
      { name: "Juma Rashidi", phone: "0754 123 456", plate: "T 482 DXK" },
      { name: "Bakari Mussa", phone: "0715 889 900", plate: "T 319 DZW" },
      { name: "Salim Athumani", phone: "0784 556 677", plate: "MC 892 BTA" },
      { name: "Kassim Ally", phone: "0762 334 455", plate: "T 901 EAB" },
    ];
    const pickedDriver = drivers[Math.floor(Math.random() * drivers.length)];
    const ref = `KK-TR-${Math.floor(100000 + Math.random() * 900000)}`;

    setConfirmedBooking({
      reference: ref,
      vehicle,
      costTzs: trip.totalFareTzs,
      distanceKm,
      durationMin,
      driverName: pickedDriver.name,
      driverPhone: pickedDriver.phone,
      plateNumber: pickedDriver.plate,
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

      {/* Booking confirmation modal */}
      {confirmedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-emerald-700 mb-3">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-lg font-bold text-ink">Gari Limechaguliwa na Dereva Amepangiwa!</h3>
              <p className="text-xs text-muted mt-1">Namba ya Safari: <span className="font-mono font-bold text-ink">{confirmedBooking.reference}</span></p>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-muted">Aina ya Gari:</span>
                <span className="font-bold text-ink">{confirmedBooking.vehicle.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Uwezo wa Mzigo:</span>
                <span className="font-semibold text-emerald-900">{confirmedBooking.vehicle.capacitySummary}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Njia & Umbali:</span>
                <span className="font-medium text-ink truncate max-w-[200px]">{origin} → {destination} ({confirmedBooking.distanceKm} km)</span>
              </div>
              <div className="flex justify-between border-t border-emerald-200/60 pt-2 text-sm">
                <span className="font-bold text-ink">Gharama ya Safari:</span>
                <span className="font-black text-emerald-900">{formatTzs(confirmedBooking.costTzs)}</span>
              </div>
            </div>

            <div className="rounded-2xl border border-line bg-subtle p-3.5 text-xs flex items-center justify-between">
              <div>
                <p className="font-bold text-ink">{confirmedBooking.driverName}</p>
                <p className="text-2xs text-muted">Bamba: <span className="font-mono font-semibold">{confirmedBooking.plateNumber}</span></p>
              </div>
              <a
                href={`tel:${confirmedBooking.driverPhone.replace(/\s+/g, "")}`}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800"
              >
                <Phone size={13} />
                <span>Piga Simu</span>
              </a>
            </div>

            <div className="flex items-center gap-2 text-2xs text-emerald-800 bg-emerald-50 p-2.5 rounded-xl">
              <ShieldCheck size={16} className="shrink-0 text-emerald-600" />
              <span>Safari inalindwa na mfumo wa Kariakoo Ground Escrow. Malipo yatalipwa baada ya mzigo kufika.</span>
            </div>

            <button
              type="button"
              onClick={() => setConfirmedBooking(null)}
              className="w-full rounded-2xl bg-ink py-3 text-xs font-bold text-white hover:bg-stone-900"
            >
              Funga na Fuatilia Safari
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
