import type { Metadata } from "next";
import { Banknote, Bike, ClipboardList, Store } from "lucide-react";
import { liveAdminOrders } from "@/lib/data/admin-live";
import { requireRole } from "@/lib/auth/session";
import { orderTotals } from "@/lib/money";
import { formatTzs } from "@/lib/format";
import { PageHeader, StatCard } from "@/components/ui/Card";
import { TableCard, THead, Th, tbodyClass, tdClass } from "@/components/ui/Table";

export const metadata: Metadata = { title: "Analytics" };
export default async function AdminAnalyticsPage() {
  const session = await requireRole("admin");
  const orders = await liveAdminOrders(session);
  const completed = orders.filter((o) => o.status === "delivered");
  const paid = orders.filter((o) => o.paymentStatus === "successful" && o.status !== "cancelled");
  const gmv = paid.reduce((sum, o) => sum + orderTotals(o.items, o.deliveryFeeTzs).merchandiseTzs, 0);
  const average = paid.length ? Math.round(gmv / paid.length) : 0;
  const counts = new Map<string, number>();
  for (const order of orders) counts.set(order.status, (counts.get(order.status) ?? 0) + 1);
  return <>
    <PageHeader title="Marketplace analytics" description={`Operational snapshot from ${orders.length} orders currently available to the dashboard. This is a live view, not a financial statement.`} />
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4"><StatCard label="Orders loaded" value={String(orders.length)} icon={<ClipboardList size={18} />} hint="Latest records" /><StatCard label="Delivered" value={String(completed.length)} icon={<Bike size={18} />} hint="In loaded records" /><StatCard label="Paid merchandise GMV" value={formatTzs(gmv)} icon={<Banknote size={18} />} hint="Excludes delivery fees" /><StatCard label="Average paid basket" value={formatTzs(average)} icon={<Store size={18} />} hint="Paid orders only" /></div>
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <TableCard label="Order status summary" minWidth="24rem"><THead><Th>Order state</Th><Th align="right">Count</Th></THead><tbody className={tbodyClass}>{[...counts.entries()].sort((a,b)=>b[1]-a[1]).map(([status,count])=><tr key={status}><th className={`${tdClass} capitalize`} scope="row">{status.replaceAll("_"," ")}</th><td className={`${tdClass} text-right tabular-nums`}>{count}</td></tr>)}</tbody></TableCard>
      <TableCard label="Fulfilment queue summary" minWidth="24rem"><THead><Th>Fulfilment state</Th><Th align="right">Shop groups</Th></THead><tbody className={tbodyClass}>{[...orders.flatMap((o)=>o.groups).reduce((m,g)=>m.set(g.status,(m.get(g.status)??0)+1),new Map<string,number>()).entries()].sort((a,b)=>b[1]-a[1]).map(([status,count])=><tr key={status}><th className={`${tdClass} capitalize`} scope="row">{status.replaceAll("_"," ")}</th><td className={`${tdClass} text-right tabular-nums`}>{count}</td></tr>)}</tbody></TableCard>
    </div>
  </>;
}
