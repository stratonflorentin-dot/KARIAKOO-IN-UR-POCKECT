"use client";

// Step-by-step delivery controls for the assigned rider. Allowed steps come
// from the shared status machine. The final step (delivered) requires the
// customer's PIN, verified by a Server Action. Other steps are a demo
// preview (not saved) until rider operations go live in Phase 6.
import { CircleCheck, KeyRound, TriangleAlert } from "lucide-react";
import { useActionState, useState } from "react";
import { submitDeliveryPin, type PinState } from "@/app/rider/actions";
import { DeliveryStatusBadge } from "@/components/orders/StatusBadges";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { canTransitionDelivery } from "@/lib/status";
import type { DeliveryStatus } from "@/lib/types";

const FAIL_REASONS = ["Customer unavailable", "Wrong address", "Goods damaged", "Customer refused delivery"];

const step: Partial<Record<DeliveryStatus, { to: DeliveryStatus; label: string; hint: string }>> = {
  ASSIGNED: { to: "ACCEPTED", label: "Accept delivery", hint: "Accepting commits you to collect from every shop listed." },
  ACCEPTED: { to: "PICKED_UP", label: "Confirm goods collected", hint: "Check item counts with each shop before confirming." },
  PICKED_UP: { to: "IN_TRANSIT", label: "Start trip to customer", hint: "The customer will see that you are on the way." },
};

export function DeliveryFlow({ orderId, initial }: { orderId: string; initial: DeliveryStatus }) {
  const [status, setStatus] = useState<DeliveryStatus>(initial);
  const [note, setNote] = useState("");
  const [reason, setReason] = useState(FAIL_REASONS[0]);
  const [pinState, pinAction, pending] = useActionState<PinState, FormData>(async (prev, fd) => {
    const result = await submitDeliveryPin(prev, fd);
    if (result.status === "ok") setStatus("DELIVERED");
    return result;
  }, { status: "idle" });

  const go = (to: DeliveryStatus, msg: string) => {
    if (!canTransitionDelivery(status, to, "rider")) return;
    setStatus(to);
    setNote(`${msg} (demo preview: not saved)`);
  };

  const next = step[status];
  const canDecline = canTransitionDelivery(status, "PENDING_ASSIGNMENT", "rider");
  const canFail = canTransitionDelivery(status, "FAILED", "rider");

  return (
    <section aria-labelledby="flow-heading" className="rounded-3xl bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 id="flow-heading" className="font-semibold">Delivery status</h2>
        <DeliveryStatusBadge status={status} />
      </div>

      {next && (
        <div className="mt-4">
          <p className="mb-2 text-sm text-muted">{next.hint}</p>
          <Button size="lg" full onClick={() => go(next.to, next.label)}>{next.label}</Button>
        </div>
      )}

      {status === "IN_TRANSIT" && (
        <form action={pinAction} className="mt-4 space-y-2">
          <input type="hidden" name="orderId" value={orderId} />
          <label htmlFor="pin" className="flex items-center gap-2 text-sm font-medium">
            <KeyRound size={16} aria-hidden="true" /> Customer&apos;s 4-digit delivery PIN
          </label>
          <input
            id="pin"
            name="pin"
            inputMode="numeric"
            pattern="\d{4}"
            maxLength={4}
            autoComplete="one-time-code"
            className="h-14 w-full rounded-2xl border border-line text-center font-mono text-2xl tracking-[0.5em] outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
            aria-describedby="pin-status"
          />
          <Button type="submit" size="lg" full variant="dark" disabled={pending}>{pending ? "Checking…" : "Confirm delivery"}</Button>
        </form>
      )}

      {status === "DELIVERED" && (
        <p className="mt-4 flex items-center gap-2 rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-900">
          <CircleCheck size={18} aria-hidden="true" /> Delivered. Well done!
        </p>
      )}

      <p id="pin-status" role="status" aria-live="polite" className={`mt-3 text-sm ${pinState.status === "error" ? "text-red-700" : "text-emerald-800"}`}>
        {pinState.message ?? note}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {canDecline && (
          <Button variant="outline" onClick={() => go("PENDING_ASSIGNMENT", "Declined, returned to dispatch")}>Decline</Button>
        )}
        {canFail && (
          <ConfirmDialog
            title="Report a failed delivery?"
            confirmLabel="Report failure"
            onConfirm={() => go("FAILED", `Reported failed: ${reason}`)}
            body={
              <fieldset>
                <legend className="mb-2">Dispatch will contact you. Reason:</legend>
                {FAIL_REASONS.map((r) => (
                  <label key={r} className="flex min-h-11 items-center gap-2 text-ink">
                    <input type="radio" name="fail-reason" checked={reason === r} onChange={() => setReason(r)} className="h-5 w-5 accent-brand-600" /> {r}
                  </label>
                ))}
              </fieldset>
            }
            trigger={(open) => (
              <Button variant="ghost" onClick={open} className="text-red-700">
                <TriangleAlert size={16} aria-hidden="true" /> Report a problem
              </Button>
            )}
          />
        )}
      </div>
    </section>
  );
}
