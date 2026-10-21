import { Bike, KeyRound, LifeBuoy, MapPin, Store, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "@/components/i18n/Link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { RoleGate } from "@/components/auth/RoleGate";
import { DeliveryStatusBadge, FulfillmentBadge, OrderStatusBadge, PaymentStatusBadge } from "@/components/orders/StatusBadges";
import { Timeline } from "@/components/orders/Timeline";
import { TrackSteps } from "@/components/orders/TrackSteps";
import { Card, CardHeader } from "@/components/ui/Card";
import { Notice, Skeleton } from "@/components/ui/States";
import { getSessionWithRole } from "@/lib/auth/session";
import { liveCustomerOrder } from "@/lib/data/customer-live";
import { getZone } from "@/lib/delivery";
import { formatDateTime, formatTzs } from "@/lib/format";
import { orderTotals } from "@/lib/money";
import { isCustomerCancellable } from "@/lib/status";
import type { Order } from "@/lib/types";

export const metadata: Metadata = { title: "Order details" };

// Every page in this area needs a signed-in session, so it is rendered per
// request. Opt out of build-time instant-navigation validation, which renders
// without a session (and would just see the access check's 404).
export const instant = false;

// Orders are private and per-user, so there is nothing to prerender.
export default function OrderDetailPage({ params }: PageProps<"/[lang]/customer/orders/[id]">) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <Link href="/customer/orders" className="text-sm font-medium text-brand-700 hover:underline">← My orders</Link>
      <Suspense fallback={<Skeleton className="mt-6 h-96" />}>
        <RoleGate role="customer">
          <OrderDetail params={params} />
        </RoleGate>
      </Suspense>
    </div>
  );
}

function upcomingSteps(o: Order): string[] {
  if (o.status === "cancelled" || o.status === "delivered") return [];
  const steps: Record<string, string[]> = {
    placed: ["Shop confirms", "Rider collects", "Delivered"],
    confirmed: ["Rider collects", "Delivered"],
    preparing: ["Rider collects", "Delivered"],
    out_for_delivery: ["Delivered"],
  };
  return steps[o.status] ?? [];
}

async function OrderDetail({ params }: Pick<PageProps<"/[lang]/customer/orders/[id]">, "params">) {
  const { id } = await params;
  const session = await getSessionWithRole("customer");
  const detail = await liveCustomerOrder(session, id);
  // Someone else's order looks exactly like a missing one.
  if (!detail) notFound();
  const { order, shopNames, pin, riderName } = detail;
  const shopName = (shopId: string) => shopNames[shopId] ?? "Shop";

  const totals = orderTotals(order.items, order.deliveryFeeTzs);

  return (
    <div className="mt-4 space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-2 text-2xl font-bold tracking-tight">Order {order.reference}</h1>
        <OrderStatusBadge status={order.status} />
        <PaymentStatusBadge status={order.paymentStatus} />
      </div>
      <p className="text-sm text-muted">Placed {formatDateTime(order.placedAt)}</p>

      {pin && (
        <div className="flex items-center gap-4 rounded-2xl bg-night p-5 text-white">
          <KeyRound className="shrink-0 text-brand-400" aria-hidden="true" />
          <div>
            <p className="text-sm text-white/70">Delivery PIN: give it to the rider only when you receive your goods</p>
            <p className="font-mono text-3xl font-bold tracking-[0.3em]">{pin}</p>
          </div>
        </div>
      )}

      {order.paymentStatus === "pending" && (
        <Notice tone="warning">Payment pending. We only mark an order paid after the payment provider confirms it to our server.</Notice>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-5">
          <Card aria-labelledby="track-heading">
            <CardHeader id="track-heading" title="Order progress" subtitle="Follow your order from confirmation to delivery." />
            <TrackSteps status={order.status} />
            <div className="mt-5 border-t border-line pt-4">
              <Timeline events={order.history} upcoming={upcomingSteps(order)} />
            </div>
          </Card>

          <Card aria-labelledby="items-heading">
            <CardHeader id="items-heading" title="Items" />
            <div className="space-y-4">
              {order.groups.map((g) => (
                <div key={g.shopId}>
                  <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                    <Store size={15} className="text-brand-600" aria-hidden="true" /> {shopName(g.shopId)} <FulfillmentBadge status={g.status} />
                  </p>
                  {g.rejectionReason && <p className="mt-1 text-sm text-red-700">Reason: {g.rejectionReason}</p>}
                  <ul className="mt-2 divide-y divide-line text-sm">
                    {order.items.filter((i) => i.shopId === g.shopId).map((i) => (
                      <li key={i.productId} className="flex justify-between gap-3 py-2">
                        <span>{i.quantity} × {i.productName} <span className="text-muted">@ {formatTzs(i.unitPriceTzs)}</span></span>
                        <span className="shrink-0 tabular-nums">{formatTzs(i.unitPriceTzs * i.quantity)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Item subtotal</dt><dd className="tabular-nums">{formatTzs(totals.merchandiseTzs)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Delivery fee</dt><dd className="tabular-nums">{formatTzs(totals.deliveryFeeTzs)}</dd></div>
              <div className="flex justify-between font-semibold"><dt>Total</dt><dd className="tabular-nums">{formatTzs(totals.customerTotalTzs)}</dd></div>
            </dl>
          </Card>
        </div>

        <div className="space-y-5">
          <Card aria-labelledby="delivery-heading">
            <CardHeader id="delivery-heading" title="Delivery" action={<DeliveryStatusBadge status={order.delivery.status} />} />
            <p className="flex gap-2 text-sm"><MapPin size={16} className="mt-0.5 shrink-0 text-brand-600" aria-hidden="true" /> {order.address}, {getZone(order.zone).name}</p>
            {order.instructions && <p className="mt-2 text-sm text-muted">“{order.instructions}”</p>}
            <p className="mt-3 flex gap-2 text-sm">
              <Bike size={16} className="mt-0.5 shrink-0 text-brand-600" aria-hidden="true" />
              {riderName ? <>Rider: {riderName}</> : "A rider will be assigned when the shop is ready."}
            </p>
          </Card>

          <Card aria-labelledby="help-heading">
            <CardHeader id="help-heading" title="Need help?" />
            <div className="space-y-2">
              <Link
                href={`/customer/orders/${order.id}/help`}
                className="flex items-center gap-2 rounded-xl border border-line px-3 py-2.5 text-sm font-semibold hover:border-brand-300 hover:bg-brand-50"
              >
                <TriangleAlert size={16} className="shrink-0 text-brand-700" aria-hidden="true" /> Report a problem with this order
              </Link>
              <Link
                href="/customer/support"
                className="flex items-center gap-2 rounded-xl border border-line px-3 py-2.5 text-sm font-semibold hover:border-brand-300 hover:bg-brand-50"
              >
                <LifeBuoy size={16} className="shrink-0 text-brand-700" aria-hidden="true" /> Visit the help centre
              </Link>
            </div>
            {isCustomerCancellable(order.status, order.paymentStatus) && (
              <p className="mt-3 text-sm text-muted">This order can still be cancelled. Cancelling will be available once ordering is live.</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
