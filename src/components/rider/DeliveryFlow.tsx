"use client";

import { KeyRound } from "lucide-react";
import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { advanceDelivery, acceptOffer, submitDeliveryPin, type PinState } from "@/app/rider/actions";
import { DeliveryStatusBadge } from "@/components/orders/StatusBadges";
import { Button } from "@/components/ui/Button";
import type { DeliveryStatus } from "@/lib/types";

export interface FlowPickup { shopName: string; items: { name: string; quantity: number }[] }

export function DeliveryFlow({ orderId, initial }: { orderId: string; initial: DeliveryStatus; pickups: FlowPickup[] }) {
  const router = useRouter();
  const [status, setStatus] = useState(initial);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [pinState, pinAction, pinPending] = useActionState<PinState, FormData>(submitDeliveryPin, { status: "idle" });

  async function transition(action: () => Promise<{ ok: boolean; message?: string; status?: DeliveryStatus }>) {
    setPending(true);
    const result = await action();
    setPending(false);
    if (!result.ok) return setNote(result.message ?? "Could not update this delivery.");
    if (result.status) setStatus(result.status);
    setNote("Delivery status saved.");
    router.refresh();
  }

  return <section aria-labelledby="delivery-flow" className="rounded-3xl bg-white p-4">
    <div className="flex items-center justify-between gap-2"><h2 id="delivery-flow" className="font-semibold">Delivery status</h2><DeliveryStatusBadge status={status} /></div>
    {status === "ASSIGNED" && <Button className="mt-4" full disabled={pending} onClick={() => transition(() => acceptOffer(orderId))}>{pending ? "Saving…" : "Accept delivery"}</Button>}
    {status === "ACCEPTED" && <Button className="mt-4" full disabled={pending} onClick={() => transition(() => advanceDelivery(orderId, "PICKED_UP"))}>{pending ? "Saving…" : "Confirm goods picked up"}</Button>}
    {status === "PICKED_UP" && <Button className="mt-4" full disabled={pending} onClick={() => transition(() => advanceDelivery(orderId, "IN_TRANSIT"))}>{pending ? "Saving…" : "Start trip to customer"}</Button>}
    {status === "IN_TRANSIT" && <form action={pinAction} className="mt-4 space-y-2">
      <input type="hidden" name="orderId" value={orderId} />
      <label htmlFor="delivery-pin" className="flex items-center gap-2 text-sm font-medium"><KeyRound size={16} aria-hidden="true" /> Customer&apos;s 4-digit delivery PIN</label>
      <input id="delivery-pin" name="pin" inputMode="numeric" pattern="\d{4}" maxLength={4} autoComplete="one-time-code" className="h-14 w-full rounded-2xl border border-line text-center font-mono text-2xl tracking-[0.5em]" />
      <Button type="submit" size="lg" full variant="dark" disabled={pinPending}>{pinPending ? "Checking…" : "Confirm delivery"}</Button>
    </form>}
    <p role="status" aria-live="polite" className="mt-3 text-sm text-muted">{pinState.message ?? note}</p>
  </section>;
}
