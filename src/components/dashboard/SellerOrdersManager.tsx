"use client";

import { useState } from "react";
import { PauseCircle, PlayCircle, Search, Store, Truck } from "lucide-react";
import { LiveSellerOrderActions } from "@/components/dashboard/LiveSellerOrderActions";
import { SellerParcelTransportModal } from "@/components/dashboard/SellerParcelTransportModal";
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
  const [isBusyPaused, setIsBusyPaused] = useState(false);
  const [transportModalOrder, setTransportModalOrder] = useState<SellerOrderViewItem | null>(null);
  const [orderVehicles, setOrderVehicles] = useState<Record<string, string>>({});

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
      {/* Rush Hour / Physical Store Rush Toggle */}
      <div className={`flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
        isBusyPaused
          ? "border-amber-300 bg-amber-50/90 text-amber-950"
          : "border-line bg-white text-ink"
      }`}>
        <div className="flex items-center gap-3">
          <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
            isBusyPaused ? "bg-amber-200 text-amber-800" : "bg-brand-50 text-brand-700"
          }`}>
            <Store size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${isBusyPaused ? "bg-amber-500 animate-pulse" : "bg-emerald-500"}`} />
              <p className="text-sm font-semibold">
                {isBusyPaused ? "Hali ya Dukani: Bize (Maagizo Mapya Yamesitishwa)" : "Hali ya Dukani: Wazi (Unapokea Maagizo)"}
              </p>
            </div>
            <p className="mt-0.5 text-xs text-muted">
              {isBusyPaused
                ? "Duka lako limesitisha kwa muda maagizo mapya mtandaoni ili uhudumie wateja wa mtaani Kariakoo bila msongamano."
                : "Duka linapokea maagizo ya mtandaoni kawaida. Ikiwa una wateja wengi dukani kwa wakati mmoja, sitisha hapa kwa muda."}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsBusyPaused((prev) => !prev)}
          className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition ${
            isBusyPaused
              ? "bg-amber-600 text-white hover:bg-amber-700 shadow-sm"
              : "border border-line bg-subtle text-ink hover:border-amber-400 hover:bg-amber-50"
          }`}
        >
          {isBusyPaused ? (
            <>
              <PlayCircle size={15} />
              <span>Fungua Kupokea Maagizo</span>
            </>
          ) : (
            <>
              <PauseCircle size={15} className="text-amber-600" />
              <span>Nipo Bize Dukani (Sitisha)</span>
            </>
          )}
        </button>
      </div>

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
        <>
        {/* Mobile: stacked cards so every control (incl. order actions) stays reachable
            without horizontal scrolling off-screen. */}
        <ul className="space-y-3 lg:hidden">
          {filtered.map((o) => {
            const b = breakdown(o.items);
            return (
              <li key={o.orderId} className="rounded-2xl border border-line bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">{o.reference}</p>
                    <p className="text-xs text-muted">{formatDateTime(o.placedAt)}</p>
                    <p className="text-xs text-muted">{isDeliveryZoneId(o.zone) ? getZone(o.zone).name.split(" (")[0] : o.zone}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-semibold tabular-nums">{formatTzs(b.sellerProceedsTzs)}</p>
                    <p className="text-2xs text-muted">{labels.afterCommission.replace("{rate}", formatBps(o.items[0]?.commissionBps ?? 0))}</p>
                  </div>
                </div>
                <ul className="mt-3 space-y-0.5 text-sm">
                  {o.items.map((i) => (<li key={i.productId}>{i.quantity} × {i.productName}</li>))}
                </ul>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <PaymentStatusBadge status={o.paymentStatus} />
                  <DeliveryStatusBadge status={o.deliveryStatus} />
                  {orderVehicles[o.orderId] ? (
                    <span className="flex items-center gap-1 text-2xs font-bold text-emerald-800"><Truck size={12} className="text-emerald-600" aria-hidden="true" />{orderVehicles[o.orderId]}</span>
                  ) : (
                    <button type="button" onClick={() => setTransportModalOrder(o)} className="inline-flex items-center gap-1 rounded-lg border border-line bg-subtle px-2 py-1 text-2xs font-semibold text-ink hover:border-brand-400 hover:bg-white">
                      <Truck size={11} className="text-brand-600" aria-hidden="true" /><span>Chagua Usafiri</span>
                    </button>
                  )}
                </div>
                <div className="mt-3 border-t border-line pt-3">
                  <LiveSellerOrderActions orderId={o.orderId} initialStatus={o.fulfillmentStatus} />
                </div>
              </li>
            );
          })}
        </ul>

        {/* Desktop: full table. */}
        <div className="hidden lg:block">
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
                    <div className="space-y-1">
                      <DeliveryStatusBadge status={o.deliveryStatus} />
                      {orderVehicles[o.orderId] ? (
                        <div className="flex items-center gap-1 text-2xs font-bold text-emerald-800">
                          <Truck size={12} className="text-emerald-600" />
                          <span>{orderVehicles[o.orderId]}</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setTransportModalOrder(o)}
                          className="inline-flex items-center gap-1 rounded-lg border border-line bg-subtle px-2 py-0.5 text-2xs font-semibold text-ink hover:border-brand-400 hover:bg-white"
                        >
                          <Truck size={11} className="text-brand-600" />
                          <span>Chagua Usafiri</span>
                        </button>
                      )}
                    </div>
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
        </div>
        </>
      )}
      {transportModalOrder && (
        <SellerParcelTransportModal
          orderReference={transportModalOrder.reference}
          orderZone={
            isDeliveryZoneId(transportModalOrder.zone)
              ? getZone(transportModalOrder.zone).name
              : transportModalOrder.zone
          }
          isOpen={Boolean(transportModalOrder)}
          onClose={() => setTransportModalOrder(null)}
          onConfirm={(vehicle) => {
            setOrderVehicles((prev) => ({
              ...prev,
              [transportModalOrder.orderId]: vehicle.name,
            }));
          }}
        />
      )}
    </div>
  );
}
