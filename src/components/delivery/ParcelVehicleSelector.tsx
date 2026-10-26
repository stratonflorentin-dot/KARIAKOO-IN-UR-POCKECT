"use client";

import Image from "next/image";
import { useState } from "react";
import { Check, ChevronDown, ChevronUp, Info, Package, Share2 } from "lucide-react";
import { formatTzs } from "@/lib/format";
import {
  GROUND_TRANSPORT_VEHICLES,
  calculateBoltTripPrice,
  type GroundTransportVehicle,
  type GroundTransportVehicleId,
} from "@/lib/parcel-transport";

interface ParcelVehicleSelectorProps {
  selectedVehicleId: GroundTransportVehicleId;
  onSelectVehicle: (vehicle: GroundTransportVehicle) => void;
  origin?: string;
  destination?: string;
  distanceKm?: number;
  durationMin?: number;
  onEditRoute?: () => void;
  paymentMethod?: string;
  onSelectPaymentMethod?: (method: string) => void;
  onConfirm?: (vehicle: GroundTransportVehicle) => void;
  confirmLabel?: string;
  showBottomBar?: boolean;
  zoneMultiplier?: number;
}

export function ParcelVehicleSelector({
  selectedVehicleId,
  onSelectVehicle,
  origin = "Kariakoo Mtaa wa Lumumba",
  destination = "Moshi Bus Stand / Mbezi Luis",
  distanceKm = 11.2,
  durationMin = 28,
  onEditRoute,
  paymentMethod = "cash",
  confirmLabel = "Chagua Gari",
  showBottomBar = true,
}: ParcelVehicleSelectorProps) {
  const [showBreakdown, setShowBreakdown] = useState(false);

  const selectedVehicle =
    GROUND_TRANSPORT_VEHICLES.find((v) => v.id === selectedVehicleId) ??
    GROUND_TRANSPORT_VEHICLES[0];

  const selectedTrip = calculateBoltTripPrice(selectedVehicle.id, distanceKm, durationMin);

  return (
    <div className="space-y-4">
      {/* Route header pill */}
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-subtle px-4 py-3 shadow-xs">
        <div className="flex flex-1 items-center gap-2 overflow-hidden text-xs sm:text-sm font-semibold">
          <div className="flex items-center gap-1.5 truncate">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-600" />
            <span className="truncate text-ink">{origin}</span>
          </div>
          <span className="shrink-0 text-muted">→</span>
          <div className="flex items-center gap-1.5 truncate">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-red-600" />
            <span className="truncate text-ink">{destination}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-stone-200/70 px-2 py-0.5 text-2xs font-bold text-stone-700">
            {distanceKm} km • ~{durationMin} dk
          </span>
          {onEditRoute && (
            <button
              type="button"
              onClick={onEditRoute}
              className="shrink-0 rounded-xl bg-white px-2.5 py-1 text-xs font-medium text-muted hover:text-ink border border-line shadow-2xs"
            >
              Badili
            </button>
          )}
        </div>
      </div>

      {/* Vehicle cards grid */}
      <div className="space-y-3">
        {GROUND_TRANSPORT_VEHICLES.map((vehicle) => {
          const isSelected = vehicle.id === selectedVehicleId;
          const trip = calculateBoltTripPrice(vehicle.id, distanceKm, durationMin);

          return (
            <button
              key={vehicle.id}
              type="button"
              onClick={() => onSelectVehicle(vehicle)}
              className={`relative flex w-full items-center justify-between gap-4 rounded-3xl border p-4 text-left transition-all ${
                isSelected
                  ? "border-2 border-emerald-700 bg-emerald-50/30 shadow-md ring-1 ring-emerald-600"
                  : "border-line bg-white hover:border-emerald-300 hover:shadow-sm"
              }`}
            >
              {/* Left: Vehicle visual badge */}
              <div className="flex items-center gap-4">
                <div
                  className={`grid h-20 w-24 shrink-0 place-items-center rounded-2xl border p-1 sm:h-22 sm:w-28 overflow-hidden ${
                    isSelected ? "border-emerald-300 bg-white" : "border-stone-100 bg-subtle"
                  }`}
                >
                  {vehicle.imageUrl ? (
                    <Image
                      src={vehicle.imageUrl}
                      alt={vehicle.name}
                      width={112}
                      height={88}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <VehicleGraphic type={vehicle.iconType} />
                  )}
                </div>

                {/* Middle: Details */}
                <div>
                  <h4 className="text-base font-bold text-ink sm:text-lg">{vehicle.name}</h4>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-emerald-800 font-medium">
                    <Package size={14} className="shrink-0 text-emerald-600" />
                    <span>{vehicle.cargoDescription}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2 text-2xs text-muted">
                    <span className="rounded-md bg-stone-100 px-1.5 py-0.5">{vehicle.capacitySummary}</span>
                    <span className="hidden sm:inline-block rounded-md bg-stone-100 px-1.5 py-0.5">
                      Base {formatTzs(vehicle.tariff.baseFareTzs)} + {formatTzs(vehicle.tariff.perKmRateTzs)}/km
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: Price & Selected checkmark */}
              <div className="flex flex-col items-end justify-between self-stretch">
                <div className="h-6 w-6">
                  {isSelected && (
                    <div className="grid h-6 w-6 place-items-center rounded-full bg-emerald-700 text-white shadow-xs">
                      <Check size={14} strokeWidth={3} />
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold text-muted">TZS</span>
                  <div className="text-base font-black tracking-tight text-emerald-900 sm:text-lg">
                    {formatTzs(trip.totalFareTzs).replace("TZS", "").trim()}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Fare Breakdown Accordion */}
      <div className="rounded-2xl border border-line bg-subtle p-3.5 text-xs">
        <button
          type="button"
          onClick={() => setShowBreakdown((prev) => !prev)}
          className="flex w-full items-center justify-between font-semibold text-ink"
        >
          <div className="flex items-center gap-2">
            <Info size={15} className="text-emerald-700" />
            <span>Mchanganuo wa Gharama ({selectedVehicle.name})</span>
          </div>
          {showBreakdown ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showBreakdown && (
          <div className="mt-3 space-y-1.5 border-t border-line pt-2.5 text-2xs">
            <div className="flex justify-between">
              <span className="text-muted">Kianzio cha Safari (Base Fare):</span>
              <span className="font-semibold text-ink">{formatTzs(selectedTrip.baseFareTzs)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Gharama ya Umbali ({selectedTrip.distanceKm} km @ {formatTzs(selectedVehicle.tariff.perKmRateTzs)}/km):</span>
              <span className="font-semibold text-ink">{formatTzs(selectedTrip.distanceFareTzs)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Gharama ya Muda ({selectedTrip.durationMinutes} dk @ {formatTzs(selectedVehicle.tariff.perMinuteRateTzs)}/dk):</span>
              <span className="font-semibold text-ink">{formatTzs(selectedTrip.timeFareTzs)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Ada ya Usalama na Huduma (3.5%):</span>
              <span className="font-semibold text-ink">{formatTzs(selectedTrip.bookingFeeTzs)}</span>
            </div>
            <div className="flex justify-between border-t border-line/60 pt-1.5 font-bold text-emerald-950">
              <span>Jumla Iliyokadiriwa:</span>
              <span className="font-black text-emerald-900">{formatTzs(selectedTrip.totalFareTzs)}</span>
            </div>
            <p className="pt-1 text-3xs text-muted leading-relaxed">
              * Bei inahesabiwa kwa uwazi kulingana na taratibu rasmi za safari (Base Fare + Umbali + Muda + Ada ya Huduma).
            </p>
          </div>
        )}
      </div>

      {/* Bottom confirmation bar if enabled */}
      {showBottomBar && (
        <div className="mt-6 rounded-3xl border border-line bg-white p-4 shadow-lg sm:p-5">
          <div className="flex items-center justify-between pb-3 border-b border-line">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-100 text-emerald-800">
                💵
              </div>
              <div>
                <span className="text-xs font-bold text-ink">
                  {paymentMethod === "cash" ? "Cash (Lipa papo hapo)" : "M-Pesa / Tigo Pesa"}
                </span>
                <p className="text-2xs text-muted">Lipa dereva akifika na mzigo wako</p>
              </div>
            </div>
            <span className="text-xs text-muted">Badili</span>
          </div>

          <div className="mt-4 flex items-center gap-3">
            {onEditRoute && (
              <button
                type="button"
                onClick={onEditRoute}
                className="rounded-2xl border border-line bg-subtle px-4 py-3 text-xs font-bold text-ink transition hover:bg-stone-200"
              >
                Edit
              </button>
            )}
            <button
              type="button"
              onClick={() => onSelectVehicle(selectedVehicle)}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-800 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-900 active:scale-98"
            >
              <span>{confirmLabel} — {selectedVehicle.name} ({formatTzs(selectedTrip.totalFareTzs)})</span>
            </button>
            <button
              type="button"
              aria-label="Share route details"
              className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-line bg-subtle text-ink transition hover:bg-stone-200"
            >
              <Share2 size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Clean vector rendering of each Kariakoo ground transport vehicle
 */
function VehicleGraphic({ type }: { type: "motorcycle" | "tricycle" | "pickup" | "truck" }) {
  if (type === "pickup") {
    return (
      <svg viewBox="0 0 140 85" className="h-full w-full object-contain" fill="none">
        <path d="M45 42 L55 24 L82 24 L90 42 Z" fill="#E2E8F0" stroke="#475569" strokeWidth="2" />
        <path d="M57 27 L78 27 L85 41 L51 41 Z" fill="#93C5FD" opacity="0.6" />
        <rect x="42" y="42" width="50" height="20" rx="3" fill="#F8FAFC" stroke="#475569" strokeWidth="2" />
        <rect x="8" y="38" width="36" height="24" rx="2" fill="#CBD5E1" stroke="#475569" strokeWidth="2" />
        <rect x="12" y="24" width="14" height="14" rx="1" fill="#D97706" stroke="#92400E" strokeWidth="1.5" />
        <rect x="27" y="22" width="15" height="16" rx="1" fill="#B45309" stroke="#78350F" strokeWidth="1.5" />
        <rect x="18" y="12" width="14" height="13" rx="1" fill="#F59E0B" stroke="#B45309" strokeWidth="1.5" />
        <rect x="91" y="48" width="5" height="12" rx="2" fill="#E2E8F0" stroke="#475569" strokeWidth="1.5" />
        <circle cx="89" cy="50" r="3" fill="#FDE047" stroke="#CA8A04" strokeWidth="1" />
        <circle cx="28" cy="62" r="11" fill="#1E293B" stroke="#475569" strokeWidth="3" />
        <circle cx="28" cy="62" r="4" fill="#94A3B8" />
        <circle cx="75" cy="62" r="11" fill="#1E293B" stroke="#475569" strokeWidth="3" />
        <circle cx="75" cy="62" r="4" fill="#94A3B8" />
      </svg>
    );
  }

  if (type === "tricycle") {
    return (
      <svg viewBox="0 0 140 85" className="h-full w-full object-contain" fill="none">
        <path d="M12 25 L65 25 L65 58 L12 58 Z" fill="#059669" stroke="#065F46" strokeWidth="2" rx="3" />
        <path d="M15 28 L62 28 L62 55 L15 55 Z" fill="#047857" opacity="0.3" />
        <path d="M65 30 L80 18 L98 32 L95 58 L65 58 Z" fill="#10B981" stroke="#065F46" strokeWidth="2" />
        <path d="M72 24 L88 32 L86 44 L70 44 Z" fill="#BAE6FD" opacity="0.8" />
        <line x1="90" y1="52" x2="100" y2="65" stroke="#334155" strokeWidth="3" strokeLinecap="round" />
        <circle cx="100" cy="64" r="10" fill="#1E293B" stroke="#475569" strokeWidth="2.5" />
        <circle cx="100" cy="64" r="3.5" fill="#94A3B8" />
        <circle cx="35" cy="64" r="10" fill="#1E293B" stroke="#475569" strokeWidth="2.5" />
        <circle cx="35" cy="64" r="3.5" fill="#94A3B8" />
        <circle cx="97" cy="40" r="3" fill="#FDE047" stroke="#EAB308" strokeWidth="1" />
      </svg>
    );
  }

  if (type === "motorcycle") {
    return (
      <svg viewBox="0 0 140 85" className="h-full w-full object-contain" fill="none">
        <path d="M38 58 L55 45 L75 45 L88 34" stroke="#1E293B" strokeWidth="3" strokeLinecap="round" />
        <path d="M55 45 L65 58" stroke="#1E293B" strokeWidth="3" strokeLinecap="round" />
        <path d="M62 42 Q72 38 78 44 Q68 47 62 42 Z" fill="#2563EB" stroke="#1D4ED8" strokeWidth="1.5" />
        <path d="M48 43 Q55 42 62 43 Q58 47 50 46 Z" fill="#1E293B" />
        <rect x="22" y="28" width="26" height="20" rx="2" fill="#D97706" stroke="#92400E" strokeWidth="2" />
        <line x1="22" y1="38" x2="48" y2="38" stroke="#B45309" strokeWidth="1.5" />
        <line x1="86" y1="34" x2="82" y2="28" stroke="#334155" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="92" cy="36" r="3.5" fill="#FDE047" stroke="#EAB308" strokeWidth="1" />
        <circle cx="95" cy="58" r="12" fill="#0F172A" stroke="#475569" strokeWidth="2.5" />
        <circle cx="95" cy="58" r="4" fill="#94A3B8" />
        <circle cx="38" cy="58" r="12" fill="#0F172A" stroke="#475569" strokeWidth="2.5" />
        <circle cx="38" cy="58" r="4" fill="#94A3B8" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 140 85" className="h-full w-full object-contain" fill="none">
      <rect x="8" y="20" width="55" height="42" rx="3" fill="#334155" stroke="#1E293B" strokeWidth="2" />
      <line x1="8" y1="34" x2="63" y2="34" stroke="#475569" strokeWidth="1.5" strokeDasharray="3 2" />
      <line x1="28" y1="20" x2="28" y2="62" stroke="#475569" strokeWidth="1.5" />
      <line x1="48" y1="20" x2="48" y2="62" stroke="#475569" strokeWidth="1.5" />
      <path d="M66 28 L86 28 L98 42 L98 62 L66 62 Z" fill="#F1F5F9" stroke="#475569" strokeWidth="2" />
      <path d="M72 32 L85 32 L92 42 L72 42 Z" fill="#93C5FD" opacity="0.6" />
      <rect x="98" y="52" width="6" height="10" rx="1" fill="#64748B" />
      <circle cx="96" cy="50" r="3" fill="#FDE047" stroke="#EAB308" strokeWidth="1" />
      <circle cx="25" cy="64" r="11" fill="#0F172A" stroke="#475569" strokeWidth="3" />
      <circle cx="25" cy="64" r="4" fill="#94A3B8" />
      <circle cx="48" cy="64" r="11" fill="#0F172A" stroke="#475569" strokeWidth="3" />
      <circle cx="48" cy="64" r="4" fill="#94A3B8" />
      <circle cx="86" cy="64" r="11" fill="#0F172A" stroke="#475569" strokeWidth="3" />
      <circle cx="86" cy="64" r="4" fill="#94A3B8" />
    </svg>
  );
}
