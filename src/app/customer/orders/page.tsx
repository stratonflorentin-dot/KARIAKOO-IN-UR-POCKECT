import { ChevronRight, Package } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { RoleGate } from "@/components/auth/RoleGate";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/orders/StatusBadges";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState, Skeleton } from "@/components/ui/States";
import { getSessionWithRole } from "@/lib/auth/session";
import { customerOrders } from "@/lib/data/access";
import { formatDateTime, formatTzs } from "@/lib/format";
import { orderTotals } from "@/lib/money";

export const metadata: Metadata = { title: "My orders" };

// Every page in this area needs a signed-in session, so it is rendered per
// request. Opt out of build-time instant-navigation validation, which renders
// without a session (and would just see the access check's 404).
export const instant = false;

export default function OrdersPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">My orders</h1>
      <Suspense fallback={<Skeleton className="mt-6 h-64" />}>
        <RoleGate role="customer">
          <OrderList />
        </RoleGate>
      </Suspense>
    </div>
  );
}

async function OrderList() {
  const orders = customerOrders(await getSessionWithRole("customer"));
  if (orders.length === 0) {
    return <div className="mt-6"><EmptyState icon={<Package size={22} />} title="No orders yet" action={<ButtonLink href="/customer">Start shopping</ButtonLink>} /></div>;
  }
  return (
    <ul className="mt-6 space-y-3">
      {orders.map((o) => {
        const totals = orderTotals(o.items, o.deliveryFeeTzs);
        const itemCount = o.items.reduce((s, i) => s + i.quantity, 0);
        return (
          <li key={o.id}>
            <Link href={`/customer/orders/${o.id}`} className="flex items-center gap-4 rounded-2xl border border-line bg-white p-4 transition hover:border-brand-300">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{o.reference}</span>
                  <OrderStatusBadge status={o.status} />
                  <PaymentStatusBadge status={o.paymentStatus} />
                </div>
                <p className="mt-1 truncate text-sm text-muted">
                  {itemCount} {itemCount === 1 ? "item" : "items"} · {o.items[0].productName}
                  {o.items.length > 1 ? ` + ${o.items.length - 1} more` : ""}
                </p>
                <p className="mt-0.5 text-xs text-muted">{formatDateTime(o.placedAt)}</p>
              </div>
              <span className="shrink-0 font-semibold tabular-nums">{formatTzs(totals.customerTotalTzs)}</span>
              <ChevronRight size={18} className="shrink-0 text-muted" aria-hidden="true" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
