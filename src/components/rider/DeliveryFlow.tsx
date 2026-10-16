"use client";

// Step-by-step delivery for the assigned rider, with swipe-to-confirm so a
// stray tap while riding can't skip a step:
//   accept → arrived at shop → checklist + pickup photo → goods collected
//   → start trip → arrived at customer → customer PIN (checked on the server)
// Allowed status changes come from the shared state machine. Demo preview:
// every step except the PIN check stays on this phone until Phase 6.
import { Camera, CircleCheck, KeyRound, TriangleAlert } from "lucide-react";
import { useActionState, useEffect, useId, useState } from "react";
import { submitDeliveryPin, type PinState } from "@/app/rider/actions";
import { DeliveryStatusBadge } from "@/components/orders/StatusBadges";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { afterDeliveryCompleted } from "@/lib/rider-store";
import { canTransitionDelivery } from "@/lib/status";
import { IMAGE_TYPES, validateImageFile } from "@/lib/validation/product";
import type { DeliveryStatus } from "@/lib/types";
import { SwipeToConfirm } from "./SwipeToConfirm";

const FAIL_REASONS = ["Customer unavailable", "Wrong address", "Goods damaged", "Customer refused delivery"];

export interface FlowPickup {
  shopName: string;
  items: { name: string; quantity: number }[];
}

export function DeliveryFlow({ orderId, initial, pickups }: { orderId: string; initial: DeliveryStatus; pickups: FlowPickup[] }) {
  const id = useId();
  const [status, setStatus] = useState<DeliveryStatus>(initial);
  const [atShop, setAtShop] = useState(false);
  const [atCustomer, setAtCustomer] = useState(false);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [photo, setPhoto] = useState<string>();
  const [photoError, setPhotoError] = useState("");
  const [note, setNote] = useState("");
  const [reason, setReason] = useState(FAIL_REASONS[0]);
  const [pinState, pinAction, pending] = useActionState<PinState, FormData>(async (prev, fd) => {
    const result = await submitDeliveryPin(prev, fd);
    if (result.status === "ok") {
      setStatus("DELIVERED");
      if (afterDeliveryCompleted() === "offline") setNote("Delivered. You are now offline, as you asked.");
    }
    return result;
  }, { status: "idle" });

  // Free the photo preview's memory when it changes or the screen closes.
  useEffect(() => () => {
    if (photo) URL.revokeObjectURL(photo);
  }, [photo]);

  const go = (to: DeliveryStatus, msg: string) => {
    if (!canTransitionDelivery(status, to, "rider")) return;
    setStatus(to);
    setNote(`${msg} (demo preview: not saved)`);
  };

  const lines = pickups.flatMap((p) => p.items.map((it, i) => ({ key: `${p.shopName}-${i}`, shop: p.shopName, ...it })));
  const allChecked = lines.length > 0 && lines.every((l) => checked[l.key]);
  const canDecline = canTransitionDelivery(status, "PENDING_ASSIGNMENT", "rider");
  const canFail = canTransitionDelivery(status, "FAILED", "rider");

  function choosePhoto(file: File | undefined) {
    if (!file) return;
    const problem = validateImageFile(file);
    if (problem) return setPhotoError(problem);
    setPhotoError("");
    setPhoto(URL.createObjectURL(file));
  }

  // The single next step, shown as one big swipe control.
  let step: React.ReactNode = null;
  if (status === "ASSIGNED") {
    step = <SwipeToConfirm key="Accept delivery" label="Accept delivery" tone="success" onConfirm={() => go("ACCEPTED", "Delivery accepted")} />;
  } else if (status === "ACCEPTED" && !atShop) {
    step = <SwipeToConfirm key="Arrived at shop" label="Arrived at shop" onConfirm={() => { setAtShop(true); setNote("Arrived at shop. Check every item."); }} />;
  } else if (status === "ACCEPTED" && atShop) {
    step = (
      <div className="space-y-4">
        <fieldset>
          <legend className="font-semibold">Pickup checklist</legend>
          <p className="text-sm text-muted">Count every item with the shop before you leave.</p>
          <ul className="mt-2 space-y-1">
            {lines.map((l) => (
              <li key={l.key}>
                <label className="flex min-h-12 items-center gap-3 rounded-xl px-2 hover:bg-subtle">
                  <input type="checkbox" checked={Boolean(checked[l.key])} onChange={(e) => setChecked((c) => ({ ...c, [l.key]: e.target.checked }))} className="h-6 w-6 accent-emerald-600" />
                  <span className="text-sm">
                    <strong className="font-semibold">{l.quantity} ×</strong> {l.name}
                    <span className="block text-xs text-muted">{l.shop}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
        <div>
          <span className="font-semibold">Pickup photo</span>
          <p className="text-sm text-muted">Photograph the packed goods as proof.</p>
          <div className="mt-2 flex items-center gap-3">
            <label htmlFor={`${id}-photo`} className="inline-flex h-12 cursor-pointer items-center gap-2 rounded-full border-2 border-line px-4 font-semibold">
              <Camera size={18} aria-hidden="true" /> {photo ? "Retake photo" : "Take photo"}
            </label>
            <input id={`${id}-photo`} type="file" accept={IMAGE_TYPES.join(",")} capture="environment" className="sr-only" onChange={(e) => choosePhoto(e.target.files?.[0])} />
            {photo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo} alt="Pickup proof photo" className="h-14 w-14 rounded-xl object-cover" />
            )}
          </div>
          {photoError && <p className="mt-1 text-sm text-red-700">{photoError}</p>}
        </div>
        <SwipeToConfirm
          key="collect"
          label={allChecked && photo ? "Goods collected" : "Check items and add photo"}
          disabled={!allChecked || !photo}
          onConfirm={() => go("PICKED_UP", "Goods collected")}
        />
      </div>
    );
  } else if (status === "PICKED_UP") {
    step = <SwipeToConfirm key="Start trip to customer" label="Start trip to customer" onConfirm={() => go("IN_TRANSIT", "On the way")} />;
  } else if (status === "IN_TRANSIT" && !atCustomer) {
    step = <SwipeToConfirm key="Arrived at customer" label="Arrived at customer" onConfirm={() => { setAtCustomer(true); setNote("Arrived. Ask the customer for their 4-digit PIN."); }} />;
  } else if (status === "IN_TRANSIT" && atCustomer) {
    step = (
      <form action={pinAction} className="space-y-2">
        <input type="hidden" name="orderId" value={orderId} />
        <label htmlFor={`${id}-pin`} className="flex items-center gap-2 text-sm font-medium">
          <KeyRound size={16} aria-hidden="true" /> Customer&apos;s 4-digit delivery PIN
        </label>
        <input
          id={`${id}-pin`}
          name="pin"
          inputMode="numeric"
          pattern="\d{4}"
          maxLength={4}
          autoComplete="one-time-code"
          className="h-14 w-full rounded-2xl border border-line text-center font-mono text-2xl tracking-[0.5em] outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
          aria-describedby={`${id}-status`}
        />
        <Button type="submit" size="lg" full variant="dark" disabled={pending}>{pending ? "Checking…" : "Confirm delivery"}</Button>
      </form>
    );
  }

  return (
    <section aria-labelledby={`${id}-heading`} className="rounded-3xl bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 id={`${id}-heading`} className="font-semibold">Delivery status</h2>
        <DeliveryStatusBadge status={status} />
      </div>

      <div className="mt-4">{step}</div>

      {status === "DELIVERED" && (
        <p className="mt-4 flex items-center gap-2 rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-900">
          <CircleCheck size={18} aria-hidden="true" /> Delivered. Well done!
        </p>
      )}

      <p id={`${id}-status`} role="status" aria-live="polite" className={`mt-3 text-sm ${pinState.status === "error" ? "text-red-700" : "text-emerald-800"}`}>
        {pinState.message ?? note}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {canDecline && <Button variant="outline" onClick={() => go("PENDING_ASSIGNMENT", "Declined, returned to dispatch")}>Decline</Button>}
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
                    <input type="radio" name={`${id}-fail`} checked={reason === r} onChange={() => setReason(r)} className="h-5 w-5 accent-brand-600" /> {r}
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
