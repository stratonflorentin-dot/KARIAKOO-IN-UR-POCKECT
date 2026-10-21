"use client";

import { useActionState } from "react";
import { updateSellerFulfillment, type SellerFulfillmentState } from "@/app/[lang]/seller/orders/actions";
import { FulfillmentBadge } from "@/components/orders/StatusBadges";
import { Button } from "@/components/ui/Button";
import type { FulfillmentStatus } from "@/lib/types";

const NEXT: Partial<Record<FulfillmentStatus, { to: FulfillmentStatus; label: string }>> = {
  awaiting_seller: { to: "accepted", label: "Accept order" },
  accepted: { to: "preparing", label: "Start preparing" },
  preparing: { to: "ready_for_pickup", label: "Mark ready for pickup" },
};
const initial: SellerFulfillmentState = { status: "idle" };

export function LiveSellerOrderActions({ orderId, initialStatus }: { orderId: string; initialStatus: FulfillmentStatus }) {
  const [state, action, pending] = useActionState<SellerFulfillmentState, FormData>(updateSellerFulfillment, initial);
  const next = NEXT[initialStatus];
  return <div className="min-w-44 space-y-2">
    <FulfillmentBadge status={initialStatus} />
    {next && <form action={action} className="space-y-2" onSubmit={(event) => {
      const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
      if (submitter?.value === "rejected" && !window.confirm("Reject this order? The customer will be notified.")) event.preventDefault();
    }}>
      <input type="hidden" name="orderId" value={orderId} />
      {initialStatus === "awaiting_seller" && <label className="block text-xs text-muted">Reason if rejecting
        <select name="reason" className="mt-1 h-9 w-full rounded-lg border border-line bg-white px-2 text-xs">
          <option value="Out of stock">Out of stock</option>
          <option value="Price changed">Price changed</option>
          <option value="Shop closed today">Shop closed today</option>
          <option value="Cannot prepare in time">Cannot prepare in time</option>
        </select>
      </label>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" name="to" value={next.to} size="sm" disabled={pending}>{pending ? "Saving…" : next.label}</Button>
        {initialStatus === "awaiting_seller" && <Button type="submit" name="to" value="rejected" variant="outline" size="sm" disabled={pending}>Reject order</Button>}
      </div>
    </form>}
    {state.message && <p role={state.status === "error" ? "alert" : "status"} className={`text-xs ${state.status === "error" ? "text-red-700" : "text-emerald-700"}`}>{state.message}</p>}
    {!next && !["rejected", "cancelled"].includes(initialStatus) && <p className="text-xs text-muted">Waiting for pickup and delivery updates.</p>}
  </div>;
}
