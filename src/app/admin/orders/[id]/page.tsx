import { Lock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DeliveryStatusBadge, FulfillmentBadge, OrderStatusBadge, PaymentStatusBadge } from "@/components/orders/StatusBadges";
import { Timeline } from "@/components/orders/Timeline";
import { Card, CardHeader } from "@/components/ui/Card";
import { Notice } from "@/components/ui/States";
import { TableCard, THead, Th, tbodyClass, tdClass } from "@/components/ui/Table";
import { requireRole } from "@/lib/auth/session";
import { liveAdminOrders } from "@/lib/data/admin-live";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getZone } from "@/lib/delivery";
import { formatDateTime, formatTzs } from "@/lib/format";
import { commissionFor, formatBps, orderTotals } from "@/lib/money";
import { formatTzPhone } from "@/lib/validation/checkout";

export const metadata: Metadata = { title: "Order" };

export default async function AdminOrderPage({ params }: PageProps<"/admin/orders/[id]">) {
  const { id } = await params;
  const session = await requireRole("admin");
  const order = (await liveAdminOrders(session)).find((o) => o.id === id);
  if (!order) notFound();
  const sb = await createSupabaseServerClient();
  const shopIds = [...new Set(order.groups.map((group) => group.shopId))];
  const { data: profileRows, error: profileError } = await sb.from("profiles").select("id,full_name,phone").in("id", [order.customerId, ...(order.delivery.riderId ? [order.delivery.riderId] : [])]);
  const { data: shopRows, error: shopError } = await sb.from("shops").select("id,name").in("id", shopIds);
  const { data: riderRows, error: riderError } = order.delivery.riderId
    ? await sb.from("riders").select("id,plate").eq("id", order.delivery.riderId).limit(1)
    : { data: [], error: null };
  if (profileError || shopError || riderError) throw new Error(`Could not load order contacts: ${profileError?.message ?? shopError?.message ?? riderError?.message}`);
  const profiles = new Map(((profileRows ?? []) as { id: string; full_name: string; phone: string | null }[]).map((p) => [p.id, p]));
  const shops = new Map(((shopRows ?? []) as { id: string; name: string }[]).map((shop) => [shop.id, shop.name]));
  const riderInfo = (riderRows?.[0] ?? null) as { id: string; plate: string } | null;
  const t = orderTotals(order.items, order.deliveryFeeTzs);
  const customer = profiles.get(order.customerId);
  const rider = riderInfo ? profiles.get(riderInfo.id) : undefined;
  const shopName = (sid: string) => shops.get(sid) ?? "Shop";
  const finalised = order.status === "delivered" || order.status === "cancelled";

  return (
    <div className="space-y-5">
      <Link href="/admin/orders" className="text-sm font-medium text-brand-700 hover:underline">← Orders</Link>
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-2 text-2xl font-bold tracking-tight">{order.reference}</h1>
        <OrderStatusBadge status={order.status} />
        <PaymentStatusBadge status={order.paymentStatus} />
        <DeliveryStatusBadge status={order.delivery.status} />
      </div>
      <p className="text-sm text-muted">Placed {formatDateTime(order.placedAt)} · paid via {order.paymentMethod.toUpperCase()} · payment, fulfilment and delivery are tracked separately.</p>

      {finalised && (
        <Notice>
          <span className="flex gap-2"><Lock size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            This order is finalised. Its financial records are read-only; corrections must use a recorded adjustment.</span>
        </Notice>
      )}

      <TableCard label="Items, prices and commission" minWidth="52rem">
        <THead><Th>Item (price snapshot)</Th><Th>Shop · fulfilment</Th><Th align="right">Qty</Th><Th align="right">Line total</Th><Th align="right">Rate</Th><Th align="right">Commission</Th><Th align="right">Seller proceeds</Th></THead>
        <tbody className={tbodyClass}>
          {order.items.map((i) => {
            const line = i.unitPriceTzs * i.quantity;
            const c = commissionFor(line, i.commissionBps);
            const group = order.groups.find((g) => g.shopId === i.shopId)!;
            return (
              <tr key={i.productId}>
                <th scope="row" className={`${tdClass} font-medium`}>{i.productName}<span className="block text-xs font-normal text-muted">@ {formatTzs(i.unitPriceTzs)}</span></th>
                <td className={tdClass}>{shopName(i.shopId)}<div className="mt-1"><FulfillmentBadge status={group.status} /></div></td>
                <td className={`${tdClass} text-right tabular-nums`}>{i.quantity}</td>
                <td className={`${tdClass} text-right tabular-nums`}>{formatTzs(line)}</td>
                <td className={`${tdClass} text-right tabular-nums`}>{formatBps(i.commissionBps)}</td>
                <td className={`${tdClass} text-right tabular-nums`}>{formatTzs(c)}</td>
                <td className={`${tdClass} text-right tabular-nums`}>{formatTzs(line - c)}</td>
              </tr>
            );
          })}
        </tbody>
      </TableCard>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card aria-labelledby="money-heading">
          <CardHeader id="money-heading" title="Money" />
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between"><dt className="text-muted">Merchandise</dt><dd className="tabular-nums">{formatTzs(t.merchandiseTzs)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Delivery fee</dt><dd className="tabular-nums">{formatTzs(t.deliveryFeeTzs)}</dd></div>
            <div className="flex justify-between font-semibold"><dt>Customer total</dt><dd className="tabular-nums">{formatTzs(t.customerTotalTzs)}</dd></div>
            <div className="flex justify-between border-t border-line pt-1.5"><dt className="text-muted">Commission</dt><dd className="tabular-nums">{formatTzs(t.commissionTzs)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Seller proceeds</dt><dd className="tabular-nums">{formatTzs(t.sellerProceedsTzs)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Rider payout</dt><dd className="tabular-nums">{formatTzs(order.delivery.riderPayoutTzs)}</dd></div>
          </dl>
        </Card>
        <Card aria-labelledby="people-heading">
          <CardHeader id="people-heading" title="Customer & delivery" />
          <p className="text-sm font-medium">{customer?.full_name ?? "Customer"}</p>
          {customer?.phone && <p className="text-sm text-muted">{formatTzPhone(customer.phone)}</p>}
          <p className="mt-2 text-sm">{order.address}, {getZone(order.zone).name}</p>
          <p className="mt-2 text-sm">Rider: {rider ? `${rider.full_name || "Rider"}${riderInfo?.plate ? ` (${riderInfo.plate})` : ""}` : "Not assigned"}</p>
          <p className="mt-2 text-xs text-muted">Rider assignment, cancellations and refunds are not available from this screen.</p>
        </Card>
        <Card aria-labelledby="hist-heading">
          <CardHeader id="hist-heading" title="Status history" />
          <Timeline events={[...order.history, ...order.delivery.history].sort((a, b) => a.at.localeCompare(b.at))} />
        </Card>
      </div>
    </div>
  );
}
