import type { Metadata } from "next";
import { LiveSellerOrderActions } from "@/components/dashboard/LiveSellerOrderActions";
import { DeliveryStatusBadge, PaymentStatusBadge } from "@/components/orders/StatusBadges";
import { PageHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/States";
import { TableCard, THead, Th, tbodyClass, tdClass } from "@/components/ui/Table";
import { requireRole } from "@/lib/auth/session";
import { liveSellerOrders, liveSellerShop } from "@/lib/data/seller-live";
import { getZone, isDeliveryZoneId } from "@/lib/delivery";
import { formatDateTime, formatTzs } from "@/lib/format";
import { breakdown, formatBps } from "@/lib/money";

export const metadata: Metadata = { title: "Orders" };

export default async function SellerOrdersPage() {
  const session = await requireRole("seller");
  const shop = await liveSellerShop(session);
    if (!shop) return <><PageHeader title="Orders" description="Your shop orders will appear here once your shop is set up." /><EmptyState title="Set up your shop first" /></>;
    const orders = await liveSellerOrders(session, shop.id);
    return <>
      <PageHeader title="Orders" description="Orders containing your shop’s products. Customer names, phone numbers, and street addresses remain private." />
      {orders.length === 0 ? <EmptyState title="No orders yet" body="New orders for your shop will appear here." /> : (
        <TableCard label="Shop orders" minWidth="60rem">
          <THead><Th>Order</Th><Th>Your items</Th><Th>Payment</Th><Th>Delivery</Th><Th align="right">Your proceeds</Th><Th>Fulfilment</Th></THead>
          <tbody className={tbodyClass}>
            {orders.map((o) => {
              const b = breakdown(o.items);
              return <tr key={o.orderId}>
                <th scope="row" className={`${tdClass} font-medium`}>
                  {o.reference}<span className="block text-xs font-normal text-muted">{formatDateTime(o.placedAt)}</span>
                  <span className="block text-xs font-normal text-muted">{isDeliveryZoneId(o.zone) ? getZone(o.zone).name.split(" (")[0] : o.zone}</span>
                </th>
                <td className={tdClass}><ul className="space-y-0.5">{o.items.map((i) => <li key={i.productId}>{i.quantity} × {i.productName}</li>)}</ul></td>
                <td className={tdClass}><PaymentStatusBadge status={o.paymentStatus} /></td>
                <td className={tdClass}><DeliveryStatusBadge status={o.deliveryStatus} /></td>
                <td className={`${tdClass} text-right tabular-nums`}>{formatTzs(b.sellerProceedsTzs)}<span className="block text-xs text-muted">after {formatBps(o.items[0]?.commissionBps ?? 0)} commission</span></td>
                <td className={tdClass}><LiveSellerOrderActions orderId={o.orderId} initialStatus={o.fulfillmentStatus} /></td>
              </tr>;
            })}
          </tbody>
        </TableCard>
      )}
    </>;
}
