"use client";

// Demo fulfilment controls. Each button only appears when the status machine
// (src/lib/status.ts) allows that transition for a seller, so sellers can
// never mark goods picked up or delivered. In Phase 3 every click becomes a
// Server Action that re-checks ownership and the transition on the server.
import { useState } from "react";
import { FulfillmentBadge } from "@/components/orders/StatusBadges";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { canTransitionFulfillment } from "@/lib/status";
import type { FulfillmentStatus } from "@/lib/types";

const REASONS = ["Out of stock", "Price changed", "Shop closed today", "Cannot prepare in time"];

const nextSteps: { to: FulfillmentStatus; label: string }[] = [
  { to: "accepted", label: "Accept order" },
  { to: "preparing", label: "Start preparing" },
  { to: "ready_for_pickup", label: "Mark ready for pickup" },
];

export function SellerOrderActions({ initial, reference }: { initial: FulfillmentStatus; reference: string }) {
  const [status, setStatus] = useState(initial);
  const [reason, setReason] = useState(REASONS[0]);
  const [note, setNote] = useState("");

  const move = (to: FulfillmentStatus, msg: string) => {
    if (!canTransitionFulfillment(status, to, "seller")) return;
    setStatus(to);
    setNote(`${msg} (demo preview: not saved)`);
  };

  const step = nextSteps.find((s) => canTransitionFulfillment(status, s.to, "seller"));
  const canReject = canTransitionFulfillment(status, "rejected", "seller");

  return (
    <div className="flex flex-col items-start gap-2">
      <FulfillmentBadge status={status} />
      <div className="flex flex-wrap gap-2">
        {step && <Button size="sm" onClick={() => move(step.to, step.label)}>{step.label}</Button>}
        {canReject && (
          <ConfirmDialog
            title={`Reject order ${reference}?`}
            confirmLabel="Reject order"
            onConfirm={() => move("rejected", `Rejected: ${reason}`)}
            body={
              <fieldset>
                <legend className="mb-2">The customer will be refunded by KARIAKOO. Choose a reason:</legend>
                {REASONS.map((r) => (
                  <label key={r} className="flex min-h-10 items-center gap-2 text-ink">
                    <input type="radio" name={`reason-${reference}`} checked={reason === r} onChange={() => setReason(r)} className="accent-brand-600" /> {r}
                  </label>
                ))}
              </fieldset>
            }
            trigger={(open) => <Button size="sm" variant="outline" onClick={open}>Reject</Button>}
          />
        )}
        {!step && !canReject && status !== "rejected" && status !== "cancelled" && (
          <span className="text-xs text-muted">Waiting for rider. Delivery is confirmed by the rider with the customer&apos;s PIN.</span>
        )}
      </div>
      <p role="status" aria-live="polite" className="text-xs text-muted">{note}</p>
    </div>
  );
}
