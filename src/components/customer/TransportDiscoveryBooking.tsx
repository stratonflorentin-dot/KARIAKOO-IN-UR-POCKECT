"use client";

// Coordinates the "riders near you" discovery map with the parcel-transport booking
// form: choosing a vehicle type on the map preselects it in the booking form and
// scrolls down to it. A specific rider is never requested — discovery positions are
// de-identified, so booking hands off to auto-dispatch, which assigns the rider.
import { useRef, useState } from "react";
import { NearbyRidersMap } from "@/components/customer/NearbyRidersMap";
import { ParcelTransportBooking } from "@/components/delivery/ParcelTransportBooking";
import type { GroundTransportVehicleId } from "@/lib/parcel-transport";

export function TransportDiscoveryBooking() {
  const [vehicleId, setVehicleId] = useState<GroundTransportVehicleId>("pickup");
  const bookingRef = useRef<HTMLDivElement>(null);

  function pickVehicle(id: GroundTransportVehicleId) {
    setVehicleId(id);
    bookingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <>
      <div className="mb-5">
        <h2 className="mb-2 text-sm font-semibold text-ink">Madereva walio karibu nawe</h2>
        <NearbyRidersMap onPickVehicle={pickVehicle} />
      </div>

      <div ref={bookingRef} className="scroll-mt-4">
        <ParcelTransportBooking userRole="customer" vehicleId={vehicleId} onVehicleChange={setVehicleId} />
      </div>
    </>
  );
}
