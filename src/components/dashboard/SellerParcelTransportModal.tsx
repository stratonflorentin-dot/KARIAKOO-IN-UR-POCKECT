"use client";

import Image from "next/image";
import { useState } from "react";
import { Check, CheckCircle2, Package, Truck, X } from "lucide-react";
import {
  GROUND_TRANSPORT_VEHICLES,
  type GroundTransportVehicle,
  type GroundTransportVehicleId,
} from "@/lib/parcel-transport";
import { formatTzs } from "@/lib/format";

interface SellerParcelTransportModalProps {
  orderReference: string;
  orderZone: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (vehicle: GroundTransportVehicle) => void;
}

export function SellerParcelTransportModal({
  orderReference,
  orderZone,
  isOpen,
  onClose,
  onConfirm,
}: SellerParcelTransportModalProps) {
  const [selectedId, setSelectedId] = useState<GroundTransportVehicleId>("pickup");
  const [confirmed, setConfirmed] = useState(false);

  if (!isOpen) return null;

  const selected =
    GROUND_TRANSPORT_VEHICLES.find((v) => v.id === selectedId) ??
    GROUND_TRANSPORT_VEHICLES[0];

  function handleConfirm() {
    setConfirmed(true);
    setTimeout(() => {
      onConfirm(selected);
      onClose();
      setConfirmed(false);
    }, 1200);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
      <div className="w-full max-w-lg rounded-3xl bg-white p-5 shadow-2xl sm:p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2.5">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-100 text-emerald-800">
              <Truck size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-ink">Chagua Usafiri wa Mzigo (Ground Transport)</h3>
              <p className="text-xs text-muted">
                Oda: <span className="font-semibold text-ink">{orderReference}</span> • Eneo: <span className="font-semibold text-ink">{orderZone}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-stone-100"
          >
            <X size={16} />
          </button>
        </div>

        {confirmed ? (
          <div className="py-8 text-center space-y-2">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-emerald-700">
              <CheckCircle2 size={32} />
            </div>
            <h4 className="text-base font-bold text-ink">Usafiri wa {selected.name} Umechaguliwa!</h4>
            <p className="text-xs text-muted">Dereva atafika dukani kwako na gari hii kuchukua mzigo.</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted leading-relaxed">
              Taja chombo sahihi kitakachoweza kubeba bidhaa za oda hii ardhini kulingana na uzito na idadi ya maboksi:
            </p>

            {/* Vehicle Options List */}
            <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
              {GROUND_TRANSPORT_VEHICLES.map((v) => {
                const isSelected = v.id === selectedId;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setSelectedId(v.id)}
                    className={`flex w-full items-center justify-between gap-3 rounded-2xl border p-3.5 text-left transition ${
                      isSelected
                        ? "border-2 border-emerald-700 bg-emerald-50/40 shadow-xs"
                        : "border-line bg-white hover:border-emerald-300"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative h-14 w-18 shrink-0 rounded-xl bg-subtle p-1 flex items-center justify-center border border-stone-200/60 overflow-hidden">
                        <Image
                          src={v.imageUrl}
                          alt={v.name}
                          width={72}
                          height={56}
                          className="h-full w-full object-contain"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-ink">{v.name}</span>
                          <span className="rounded bg-stone-100 px-1.5 py-0.5 text-2xs text-muted">{v.capacitySummary}</span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-emerald-800 font-medium">
                          <Package size={13} className="text-emerald-600" />
                          <span>{v.cargoDescription}</span>
                        </div>
                        <p className="mt-0.5 text-3xs text-muted">
                          Kiwango: Base {formatTzs(v.tariff.baseFareTzs)} • {formatTzs(v.tariff.perKmRateTzs)}/km
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end shrink-0">
                      <div className="h-5 w-5 mb-1">
                        {isSelected && (
                          <div className="grid h-5 w-5 place-items-center rounded-full bg-emerald-700 text-white">
                            <Check size={12} strokeWidth={3} />
                          </div>
                        )}
                      </div>
                      <span className="text-xs font-black text-emerald-900">{formatTzs(v.baseRateTzs)}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2.5 pt-2 border-t border-line">
              <button
                type="button"
                onClick={onClose}
                className="w-1/3 rounded-2xl border border-line py-3 text-xs font-semibold text-muted hover:bg-stone-50"
              >
                Ghairi
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="flex-1 rounded-2xl bg-emerald-800 py-3 text-xs font-bold text-white shadow-xs hover:bg-emerald-900"
              >
                Thibitisha {selected.name}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
