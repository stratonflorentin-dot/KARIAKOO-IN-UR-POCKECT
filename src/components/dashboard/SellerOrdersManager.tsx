"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { LiveSellerOrderActions } from "@/components/dashboard/LiveSellerOrderActions";
import { DeliveryStatusBadge, PaymentStatusBadge } from "@/components/orders/StatusBadges";
import { EmptyState } from "@/components/ui/States";
import { TableCard, THead, Th, tbodyClass, tdClass } from "@/components/ui/Table";
import { getZone, isDeliveryZoneId } from "@/lib/delivery";
import { formatDateTime, formatTzs } from "@/lib/format";
import { breakdown, formatBps } from "@/lib/money";
import type { FulfillmentStatus, PaymentStatus, DeliveryStatus } from "@/lib/types";

export interface SellerOrderViewItem {
  orderId: string;
  reference: string;
  placedAt: string;
  zone: string;
  paymentStatus: PaymentStatus;
  deliveryStatus: DeliveryStatus;
  fulfillmentStatus: FulfillmentStatus;
  items: {
    productId: string;
    productName: string;
    unitPriceTzs: number;
    quantity: number;
    commissionBps: number;
  }[];
}

type TabKey = "all" | "new" | "preparing" | "completed";

export function SellerOrdersManager({
  orders,
  labels,
}: {
  orders: SellerOrderViewItem[];
  labels: {
    colOrder: string;
    colItems: string;
    colPayment: string;
    colDelivery: string;
    colProceeds: string;
    colFulfilment: string;
    afterCommission: string;
    noOrders: string;
    noOrdersBody: string;
    shopOrders: string;
  };
}) {
  const [tab, setTab] = useState<TabKey>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const counts: Record<TabKey, number> = {
    all: orders.length,
    new: orders.filter((o) => ["awaiting_seller", "accepted"].includes(o.fulfillmentStatus)).length,
    preparing: orders.filter((o) => ["preparing", "ready_for_pickup"].includes(o.fulfillmentStatus)).length,
    completed: orders.filter((o) => ["picked_up", "delivered", "rejected", "cancelled"].includes(o.fulfillmentStatus)).length,
  };

  const byTab = orders.filter((o) => {
    if (tab === "all") return true;
    if (tab === "new") return ["awaiting_seller", "accepted"].includes(o.fulfillmentStatus);
    if (tab === "preparing") return ["preparing", "ready_for_pickup"].includes(o.fulfillmentStatus);
    if (tab === "completed") return ["picked_up", "delivered", "rejected", "cancelled"].includes(o.fulfillmentStatus);
    return true;
  });

  const filtered = searchQuery.trim()
    ? byTab.filter(
        (o) =>
          o.reference.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
          o.items.some((i) => i.productName.toLowerCase().includes(searchQuery.toLowerCase().trim())),
      )
    : byTab;

  // Calculate settlement metrics for Screen 11: Total Sales, Marketplace Fee, Net Payout
  let totalSalesTzs = 0;
  let marketplaceFeeTzs = 0;
  let netPayoutTzs = 0;

  for (const o of orders) {
    if (o.fulfillmentStatus !== "rejected" && o.fulfillmentStatus !== "cancelled") {
      const b = breakdown(o.items);
      totalSalesTzs += b.merchandiseTzs;
      marketplaceFeeTzs += b.commissionTzs;
      netPayoutTzs += b.sellerProceedsTzs;
    }
  }

  const tabs: { id: TabKey; label: string }[] = [
    { id: "all", label: "All" },
    { id: "new", label: "New" },
    { id: "preparing", label: "Preparing" },
    { id: "completed", label: "Completed" },
  ];

  return (
    <div className="space-y-6">
      {/* Settlement Overview Card matching Screen 11 */}
      <section aria-labelledby="settlement-overview" className="rounded-3xl border border-line bg-gradient-to-br from-brand-900 via-brand-950 to-night p-6 text-white shadow-sm">
        <h2 id="settlement-overview" className="text-sm font-semibold uppercase tracking-wider text-brand-300">
          Settlement Overview
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-white/5 p-4 backdrop-blur-sm">
            <p className="text-xs text-white/70">Total Sales (Gross)</p>
            <p className="mt-1 text-xl font-bold tabular-nums sm:text-2xl">{formatTzs(totalSalesTzs)}</p>
          </div>
          <div className="rounded-2xl bg-white/5 p-4 backdrop-blur-sm">
            <p className="text-xs text-white/70">Marketplace Fee</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-amber-300 sm:text-2xl">{formatTzs(marketplaceFeeTzs)}</p>
          </div>
          <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
            <p className="text-xs text-white/70">Net Payout</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-emerald-400 sm:text-2xl">{formatTzs(netPayoutTzs)}</p>
          </div>
        </div>
      </section>

      {/* Tabs and Quick Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="tablist" aria-label="Filter orders by stage" className="no-scrollbar flex gap-2 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition ${
                tab === t.id ? "bg-brand-600 text-white" : "border border-line bg-white text-ink hover:border-brand-300"
              }`}
            >
              <span>{t.label}</span>
              <span className={`rounded-full px-1.5 text-xs tabular-nums ${tab === t.id ? "bg-white/20" : "bg-subtle text-muted"}`}>
                {counts[t.id]}
              </span>
            </button>
          ))}
        </div>

        <div className="relative min-w-48 sm:w-64">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reference or item…"
            className="h-9 w-full rounded-full border border-line bg-white pl-9 pr-3 text-xs outline-none transition placeholder:text-muted focus:border-brand-500"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title={labels.noOrders} body={labels.noOrdersBody} />
      ) : (
        <TableCard label={labels.shopOrders} minWidth="60rem">
          <THead>
            <Th>{labels.colOrder}</Th>
            <Th>{labels.colItems}</Th>
            <Th>{labels.colPayment}</Th>
            <Th>{labels.colDelivery}</Th>
            <Th align="right">{labels.colProceeds}</Th>
            <Th>{labels.colFulfilment}</Th>
          </THead>
          <tbody className={tbodyClass}>
            {filtered.map((o) => {
              const b = breakdown(o.items);
              return (
                <tr key={o.orderId}>
                  <th scope="row" className={`${tdClass} font-medium`}>
                    {o.reference}
                    <span className="block text-xs font-normal text-muted">{formatDateTime(o.placedAt)}</span>
                    <span className="block text-xs font-normal text-muted">
                      {isDeliveryZoneId(o.zone) ? getZone(o.zone).name.split(" (")[0] : o.zone}
                    </span>
                  </th>
                  <td className={tdClass}>
                    <ul className="space-y-0.5">
                      {o.items.map((i) => (
                        <li key={i.productId}>
                          {i.quantity} × {i.productName}
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className={tdClass}>
                    <PaymentStatusBadge status={o.paymentStatus} />
                  </td>
                  <td className={tdClass}>
                    <DeliveryStatusBadge status={o.deliveryStatus} />
                  </td>
                  <td className={`${tdClass} text-right tabular-nums`}>
                    {formatTzs(b.sellerProceedsTzs)}
                    <span className="block text-xs text-muted">
                      {labels.afterCommission.replace("{rate}", formatBps(o.items[0]?.commissionBps ?? 0))}
                    </span>
                  </td>
                  <td className={tdClass}>
                    <LiveSellerOrderActions orderId={o.orderId} initialStatus={o.fulfillmentStatus} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </TableCard>
      )}
    </div>
  );
}
