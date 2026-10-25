"use client";

import { useState } from "react";
import Link from "@/components/i18n/Link";
import { LifeBuoy, Package } from "lucide-react";
import { ReorderButton } from "@/components/customer/ReorderButton";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/orders/StatusBadges";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/States";
import { formatDateTime, formatTzs } from "@/lib/format";
import { orderTotals } from "@/lib/money";
import type { Order } from "@/lib/types";

type FilterTab = "all" | "processing" | "delivered" | "cancelled";

interface CustomerOrdersListProps {
  orders: Order[];
  labels: {
    noOrders: string;
    startShopping: string;
    item: string;
    items: string;
    more: string;
  };
}

export function CustomerOrdersList({ orders, labels }: CustomerOrdersListProps) {
  const [tab, setTab] = useState<FilterTab>("all");

  const counts: Record<FilterTab, number> = {
    all: orders.length,
    processing: orders.filter((o) => ["placed", "confirmed", "preparing", "out_for_delivery"].includes(o.status)).length,
    delivered: orders.filter((o) => o.status === "delivered").length,
    cancelled: orders.filter((o) => o.status === "cancelled").length,
  };

  const filteredOrders = orders.filter((o) => {
    if (tab === "all") return true;
    if (tab === "processing") return ["placed", "confirmed", "preparing", "out_for_delivery"].includes(o.status);
    if (tab === "delivered") return o.status === "delivered";
    if (tab === "cancelled") return o.status === "cancelled";
    return true;
  });

  const tabs: { id: FilterTab; label: string }[] = [
    { id: "all", label: "All" },
    { id: "processing", label: "Processing" },
    { id: "delivered", label: "Delivered" },
    { id: "cancelled", label: "Cancelled" },
  ];

  return (
    <div className="space-y-6">
      {/* Tabs matching Screen 10 */}
      <div role="tablist" aria-label="Filter orders" className="no-scrollbar flex gap-2 overflow-x-auto">
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

      {filteredOrders.length === 0 ? (
        <EmptyState
          icon={<Package size={22} />}
          title={tab === "all" ? labels.noOrders : `No ${tab} orders found`}
          action={<ButtonLink href="/customer">{labels.startShopping}</ButtonLink>}
        />
      ) : (
        <ul className="space-y-3">
          {filteredOrders.map((o) => {
            const totals = orderTotals(o.items, o.deliveryFeeTzs);
            const itemCount = o.items.reduce((s, i) => s + i.quantity, 0);
            return (
              <li key={o.id} className="rounded-2xl border border-line bg-white p-4 transition hover:border-brand-300">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <Link href={`/customer/orders/${o.id}`} className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{o.reference}</span>
                      <OrderStatusBadge status={o.status} />
                      <PaymentStatusBadge status={o.paymentStatus} />
                    </div>
                    <p className="mt-1 truncate text-sm text-muted">
                      {itemCount === 1 ? labels.item : `${itemCount} items`} · {o.items[0]?.productName ?? "Order"}
                      {o.items.length > 1 ? ` +${o.items.length - 1} more` : ""}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">{formatDateTime(o.placedAt)}</p>
                  </Link>
                  <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
                    <span className="font-semibold tabular-nums">{formatTzs(totals.customerTotalTzs)}</span>
                    <ReorderButton items={o.items} className="!h-8 !px-3 !text-xs" />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Support Card matching Screen 10 */}
      <div className="flex flex-col items-start justify-between gap-4 rounded-3xl border border-line bg-white p-5 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-700">
            <LifeBuoy size={20} aria-hidden="true" />
          </span>
          <div>
            <p className="font-bold">Need Help?</p>
            <p className="text-xs text-muted">Get support for your delivery, payment, or report an issue.</p>
          </div>
        </div>
        <Link
          href="/customer/support"
          className="inline-flex h-10 items-center justify-center rounded-full border border-line px-4 text-xs font-semibold text-ink transition hover:border-brand-400 hover:bg-brand-50"
        >
          Contact Support
        </Link>
      </div>
    </div>
  );
}
