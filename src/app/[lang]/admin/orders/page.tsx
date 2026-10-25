import type { Metadata } from "next";
import Link from "@/components/i18n/Link";
import { DeliveryStatusBadge, OrderStatusBadge, PaymentStatusBadge } from "@/components/orders/StatusBadges";
import { buttonClasses } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/Card";
import { compactInputClass } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/States";
import { TableCard, THead, Th, tbodyClass, tdClass } from "@/components/ui/Table";
import { requireRole } from "@/lib/auth/session";
import { liveAdminOrders } from "@/lib/data/admin-live";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDateTime, formatTzs } from "@/lib/format";
import { orderTotals } from "@/lib/money";
import { orderStatusLabel } from "@/lib/status";
import type { OrderStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Orders" };

export default async function AdminOrdersPage({ searchParams }: PageProps<"/[lang]/admin/orders">) {
  const session = await requireRole("admin");
  const orders = await liveAdminOrders(session);
  const sb = await createSupabaseServerClient();
  const customerIds = [...new Set(orders.map((order) => order.customerId))];
  const shopIds = [...new Set(orders.flatMap((order) => order.groups.map((group) => group.shopId)))];
  const [{ data: profileRows, error: profileError }, { data: shopRows, error: shopError }] = await Promise.all([
    sb.from("profiles").select("id,full_name").in("id", customerIds),
    sb.from("shops").select("id,name").in("id", shopIds),
  ]);
  if (profileError || shopError) throw new Error(`Could not load order details: ${profileError?.message ?? shopError?.message}`);
  const customers = new Map(((profileRows ?? []) as { id: string; full_name: string }[]).map((r) => [r.id, r.full_name]));
  const shops = new Map(((shopRows ?? []) as { id: string; name: string }[]).map((r) => [r.id, r.name]));
  const params = await searchParams;
  const q = (typeof params.q === "string" ? params.q : "").trim().toLowerCase().slice(0, 80);
  const status = typeof params.status === "string" && params.status in orderStatusLabel ? (params.status as OrderStatus) : undefined;

  const customerName = (id: string) => customers.get(id) || "Customer";
  const shopNames = (ids: string[]) => ids.map((id) => shops.get(id) ?? "Shop");

  const rows = orders
    .filter((o) => !status || o.status === status)
    .filter((o) => {
      if (!q) return true;
      const hay = [o.reference, customerName(o.customerId), ...shopNames(o.groups.map((g) => g.shopId)), o.status, o.paymentStatus].join(" ").toLowerCase();
      return hay.includes(q);
    })
    .sort((a, b) => b.placedAt.localeCompare(a.placedAt));

  const totalVolume = rows.reduce((acc, o) => acc + orderTotals(o.items, o.deliveryFeeTzs).customerTotalTzs, 0);
  const totalCommission = rows
    .filter((o) => o.paymentStatus === "successful" && o.status !== "cancelled")
    .reduce((acc, o) => acc + orderTotals(o.items, o.deliveryFeeTzs).commissionTzs, 0);
  const unassignedDeliveries = rows.filter((o) => o.status !== "cancelled" && o.status !== "delivered" && !o.delivery.riderId).length;

  return (
    <>
      <PageHeader title="Orders" description="Every order is placed with KARIAKOO, split into one fulfilment group per shop, and delivered by one rider." />
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-line bg-white p-4">
          <p className="text-xs font-medium text-muted">Orders shown</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{rows.length}</p>
        </div>
        <div className="rounded-2xl border border-line bg-white p-4">
          <p className="text-xs font-medium text-muted">Filtered GMV</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-brand-800">{formatTzs(totalVolume)}</p>
        </div>
        <div className="rounded-2xl border border-line bg-white p-4">
          <p className="text-xs font-medium text-muted">Realized commission</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-emerald-800">{formatTzs(totalCommission)}</p>
        </div>
        <div className="rounded-2xl border border-line bg-white p-4">
          <p className="text-xs font-medium text-muted">Awaiting rider</p>
          <p className={`mt-1 text-2xl font-bold tabular-nums ${unassignedDeliveries > 0 ? "text-amber-700" : "text-muted"}`}>
            {unassignedDeliveries}
          </p>
        </div>
      </div>
      <form action="/admin/orders" className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="o-q" className="text-sm font-medium">Search by reference, customer or shop</label>
          <input id="o-q" name="q" type="search" defaultValue={q} className={`${compactInputClass} mt-1`} placeholder="e.g. KK-260102, Asha, Msimbazi" />
        </div>
        <div className="sm:w-52">
          <label htmlFor="o-status" className="text-sm font-medium">Status</label>
          <select id="o-status" name="status" defaultValue={status ?? ""} className={`${compactInputClass} mt-1`}>
            <option value="">All statuses</option>
            {Object.entries(orderStatusLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <button type="submit" className={buttonClasses({ variant: "dark" })}>Search</button>
      </form>

      {rows.length === 0 ? (
        <EmptyState title="No orders match" action={<Link href="/admin/orders" className={buttonClasses({ variant: "outline" })}>Clear search</Link>} />
      ) : (
        <TableCard label="All orders" minWidth="64rem">
          <THead><Th>Order</Th><Th>Customer</Th><Th>Shops</Th><Th>Status</Th><Th>Payment</Th><Th>Delivery</Th><Th align="right">Total</Th><Th align="right">Commission</Th></THead>
          <tbody className={tbodyClass}>
            {rows.map((o) => {
              const t = orderTotals(o.items, o.deliveryFeeTzs);
              return (
                <tr key={o.id}>
                  <th scope="row" className={`${tdClass} font-medium`}>
                    <Link href={`/admin/orders/${o.id}`} className="text-brand-700 hover:underline">{o.reference}</Link>
                    <span className="block text-xs font-normal text-muted">{formatDateTime(o.placedAt)}</span>
                  </th>
                  <td className={tdClass}>{customerName(o.customerId)}</td>
                  <td className={tdClass}>{shopNames(o.groups.map((g) => g.shopId)).join(", ")}</td>
                  <td className={tdClass}><OrderStatusBadge status={o.status} /></td>
                  <td className={tdClass}><PaymentStatusBadge status={o.paymentStatus} /></td>
                  <td className={tdClass}>
                    <DeliveryStatusBadge status={o.delivery.status} />
                    <span className="mt-1 block text-xs text-muted">{o.delivery.riderId ? "Rider assigned" : "No rider"}</span>
                  </td>
                  <td className={`${tdClass} text-right tabular-nums`}>{formatTzs(t.customerTotalTzs)}</td>
                  <td className={`${tdClass} text-right tabular-nums`}>{o.paymentStatus === "successful" && o.status !== "cancelled" ? formatTzs(t.commissionTzs) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </TableCard>
      )}
    </>
  );
}
