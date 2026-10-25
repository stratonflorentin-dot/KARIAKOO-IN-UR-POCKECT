"use client";

import { useActionState } from "react";
import { updateSellerFulfillment, type SellerFulfillmentState } from "@/app/[lang]/seller/orders/actions";
import { FulfillmentBadge } from "@/components/orders/StatusBadges";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/i18n/client";
import type { FulfillmentStatus } from "@/lib/types";

const NEXT: Partial<Record<FulfillmentStatus, { to: FulfillmentStatus; labelKey: "acceptOrder" | "startPreparing" | "markReady" }>> = {
  awaiting_seller: { to: "accepted", labelKey: "acceptOrder" },
  accepted: { to: "preparing", labelKey: "startPreparing" },
  preparing: { to: "ready_for_pickup", labelKey: "markReady" },
};
const initial: SellerFulfillmentState = { status: "idle" };

export function LiveSellerOrderActions({ orderId, initialStatus }: { orderId: string; initialStatus: FulfillmentStatus }) {
  const { t } = useI18n();
  const s = t.seller;
  const [state, action, pending] = useActionState<SellerFulfillmentState, FormData>(updateSellerFulfillment, initial);
  const next = NEXT[initialStatus];
  return <div className="min-w-44 space-y-2">
    <FulfillmentBadge status={initialStatus} />
    {next && <form action={action} className="space-y-2" onSubmit={(event) => {
      const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
      if (submitter?.value === "rejected" && !window.confirm(s.rejectConfirm)) event.preventDefault();
    }}>
      <input type="hidden" name="orderId" value={orderId} />
      {initialStatus === "awaiting_seller" && (
        <div className="space-y-1">
          <label className="block text-xs text-muted">{s.reasonIfRejecting}
            <select name="reason" className="mt-1 h-9 w-full rounded-lg border border-line bg-white px-2 text-xs">
              <option value="Out of stock">{s.reasonOutOfStock}</option>
              <option value="Price changed">{s.reasonPriceChanged}</option>
              <option value="Shop closed today">{s.reasonClosed}</option>
              <option value="Cannot prepare in time">{s.reasonCannotPrepare}</option>
            </select>
          </label>
          <p className="text-[10px] text-muted">Rejecting returns reserved stock back to your catalog.</p>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" name="to" value={next.to} size="sm" disabled={pending}>{pending ? s.saving : s[next.labelKey]}</Button>
        {initialStatus === "awaiting_seller" && <Button type="submit" name="to" value="rejected" variant="outline" size="sm" disabled={pending}>{s.rejectOrder}</Button>}
      </div>
    </form>}
    {state.message && <p role={state.status === "error" ? "alert" : "status"} className={`text-xs ${state.status === "error" ? "text-red-700" : "text-emerald-700"}`}>{state.message}</p>}
    {!next && !["rejected", "cancelled"].includes(initialStatus) && <p className="text-xs text-muted">{s.waitingUpdates}</p>}
  </div>;
}
