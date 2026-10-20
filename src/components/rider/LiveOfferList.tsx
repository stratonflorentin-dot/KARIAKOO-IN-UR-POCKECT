"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { acceptOffer, declineOffer } from "@/app/rider/actions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatTzs } from "@/lib/format";

export interface RiderOffer { orderId: string; payoutTzs: number; expiresAt: string }

export function LiveOfferList({ offers }: { offers: RiderOffer[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string>();
  const [message, setMessage] = useState("");

  async function decide(orderId: string, accept: boolean) {
    setBusy(orderId);
    setMessage("");
    const result = accept ? await acceptOffer(orderId) : await declineOffer(orderId);
    setBusy(undefined);
    if (!result.ok) return setMessage(result.message);
    if (accept) router.push(`/rider/jobs/${orderId}`);
    router.refresh();
  }

  if (offers.length === 0) return null;
  return <section aria-labelledby="offers-heading" className="space-y-3">
    <h2 id="offers-heading" className="text-lg font-bold">Delivery requests</h2>
    {offers.map((offer) => <Card key={offer.orderId} className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div><p className="font-semibold">New delivery offer</p><p className="text-xs text-muted">Expires {new Date(offer.expiresAt).toLocaleTimeString("en-TZ", { hour: "2-digit", minute: "2-digit" })}</p></div>
        <p className="font-bold tabular-nums">{formatTzs(offer.payoutTzs)}</p>
      </div>
      <div className="flex gap-2"><Button disabled={Boolean(busy)} onClick={() => decide(offer.orderId, true)}>{busy === offer.orderId ? "Saving…" : "Accept"}</Button><Button variant="outline" disabled={Boolean(busy)} onClick={() => decide(offer.orderId, false)}>Decline</Button></div>
    </Card>)}
    <p role="status" aria-live="polite" className="text-sm text-red-700">{message}</p>
  </section>;
}
