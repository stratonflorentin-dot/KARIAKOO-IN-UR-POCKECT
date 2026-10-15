import type { Metadata } from "next";
import { SellerOrderActions } from "@/components/dashboard/SellerOrderActions";
import { DeliveryStatusBadge, PaymentStatusBadge } from "@/components/orders/StatusBadges";
import { PageHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/States";
import { TableCard, THead, Th, tbodyClass, tdClass } from "@/components/ui/Table";
import { requireRole } from "@/lib/auth/session";
import { sellerOrders } from "@/lib/data/access";
import { getZone } from "@/lib/delivery";
import { formatDateTime, formatTzs } from "@/lib/format";
import { breakdown, formatBps } from "@/lib/money";

export const metadata: Metadata = { title: "Orders" };

export default async function SellerOrdersPage() {
  const orders = sellerOrders(await requireRole("seller"));

  return (
    <>
      <PageHeader
        title="Orders"
        description="Items customers bought from your shop through KARIAKOO. Customer phone numbers stay with KARIAKOO and the rider."
      />
      {orders.length === 0 ? (
        <EmptyState title="No orders yet" />
      ) : (
        <TableCard label="Shop orders" minWidth="60rem">
          <THead>
            <Th>Order</Th><Th>Your items</Th><Th>Payment</Th><Th>Delivery</Th><Th align="right">Your proceeds</Th><Th>Fulfilment</Th>
          </THead>
          <tbody className={tbodyClass}>
            {orders.map((o) => {
              const b = breakdown(o.items);
              return (
                <tr key={o.orderId}>
                  <th scope="row" className={`${tdClass} font-medium`}>
                    {o.reference}
                    <span className="block text-xs font-normal text-muted">{formatDateTime(o.placedAt)}</span>
                    <span className="block text-xs font-normal text-muted">{o.customerFirstName} · {getZone(o.zone).name.split(" (")[0]}</span>
                  </th>
                  <td className={tdClass}>
                    <ul className="space-y-0.5">
                      {o.items.map((i) => <li key={i.productId}>{i.quantity} × {i.productName}</li>)}
                    </ul>
                  </td>
                  <td className={tdClass}><PaymentStatusBadge status={o.paymentStatus} /></td>
                  <td className={tdClass}>
                    <DeliveryStatusBadge status={o.deliveryStatus} />
                    {o.riderName && <span className="mt-1 block text-xs text-muted">Rider: {o.riderName}</span>}
                  </td>
                  <td className={`${tdClass} text-right tabular-nums`}>
                    {formatTzs(b.sellerProceedsTzs)}
                    <span className="block text-xs text-muted">after {formatBps(o.items[0].commissionBps)} commission</span>
                  </td>
                  <td className={tdClass}><SellerOrderActions initial={o.group.status} reference={o.reference} /></td>
                </tr>
              );
            })}
          </tbody>
        </TableCard>
      )}
    </>
  );
}
