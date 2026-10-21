import type { Metadata } from "next";
import { LiveSellerOrderActions } from "@/components/dashboard/LiveSellerOrderActions";
import { DeliveryStatusBadge, PaymentStatusBadge } from "@/components/orders/StatusBadges";
import { PageHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/States";
import { TableCard, THead, Th, tbodyClass, tdClass } from "@/components/ui/Table";
import { fmt } from "@/i18n/config";
import { getDictionary } from "@/i18n/server";
import { requireRole } from "@/lib/auth/session";
import { liveSellerOrders, liveSellerShop } from "@/lib/data/seller-live";
import { getZone, isDeliveryZoneId } from "@/lib/delivery";
import { formatDateTime, formatTzs } from "@/lib/format";
import { breakdown, formatBps } from "@/lib/money";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).dash.seller.orders };
}

export default async function SellerOrdersPage() {
  const t = await getDictionary();
  const s = t.seller;
  const session = await requireRole("seller");
  const shop = await liveSellerShop(session);
    if (!shop) return <><PageHeader title={s.ordersAction} description={s.ordersNoShopDesc} /><EmptyState title={s.setUpFirst} /></>;
    const orders = await liveSellerOrders(session, shop.id);
    return <>
      <PageHeader title={s.ordersAction} description={s.ordersDesc} />
      {orders.length === 0 ? <EmptyState title={t.orders.noOrders} body={s.noOrdersBody} /> : (
        <TableCard label={s.shopOrders} minWidth="60rem">
          <THead><Th>{s.colOrder}</Th><Th>{s.colItems}</Th><Th>{s.colPayment}</Th><Th>{s.colDelivery}</Th><Th align="right">{s.colProceeds}</Th><Th>{s.colFulfilment}</Th></THead>
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
                <td className={`${tdClass} text-right tabular-nums`}>{formatTzs(b.sellerProceedsTzs)}<span className="block text-xs text-muted">{fmt(s.afterCommission, { rate: formatBps(o.items[0]?.commissionBps ?? 0) })}</span></td>
                <td className={tdClass}><LiveSellerOrderActions orderId={o.orderId} initialStatus={o.fulfillmentStatus} /></td>
              </tr>;
            })}
          </tbody>
        </TableCard>
      )}
    </>;
}
