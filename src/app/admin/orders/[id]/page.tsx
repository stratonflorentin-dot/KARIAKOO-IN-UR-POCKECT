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
import { adminData } from "@/lib/data/access";
import { getZone } from "@/lib/delivery";
import { formatDateTime, formatTzs } from "@/lib/format";
import { commissionFor, formatBps, orderTotals } from "@/lib/money";
import { formatTzPhone } from "@/lib/validation/checkout";

export const metadata: Metadata = { title: "Order" };

export default async function AdminOrderPage({ params }: PageProps<"/admin/orders/[id]">) {
  const { id } = await params;
  const { orders, customers, shops, riders } = adminData(await requireRole("admin"));
  const order = orders.find((o) => o.id === id);
  if (!order) notFound();
  const t = orderTotals(order.items, order.deliveryFeeTzs);
  const customer = customers.find((c) => c.id === order.customerId);
  const rider = riders.find((r) => r.id === order.delivery.riderId);
  const shopName = (sid: string) => shops.find((s) => s.id === sid)?.name ?? sid;
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
            This order is finalised. Its financial records are read-only; corrections are made with recorded adjustments (Phase 5).</span>
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
          <p className="text-sm font-medium">{customer?.name}</p>
          {customer && <p className="text-sm text-muted">{formatTzPhone(customer.phone)}</p>}
          <p className="mt-2 text-sm">{order.address}, {getZone(order.zone).name}</p>
          <p className="mt-2 text-sm">Rider: {rider ? `${rider.name} (${rider.plate})` : "Not assigned"}</p>
          <p className="mt-2 text-xs text-muted">Assigning riders, cancellations and refunds become audited actions in Phases 5–6.</p>
        </Card>
        <Card aria-labelledby="hist-heading">
          <CardHeader id="hist-heading" title="Status history" />
          <Timeline events={[...order.history, ...order.delivery.history].sort((a, b) => a.at.localeCompare(b.at))} />
        </Card>
      </div>
    </div>
  );
}
