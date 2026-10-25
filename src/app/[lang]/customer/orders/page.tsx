import type { Metadata } from "next";
import { Suspense } from "react";
import { RoleGate } from "@/components/auth/RoleGate";
import { CustomerOrdersList } from "@/components/orders/CustomerOrdersList";
import { Skeleton } from "@/components/ui/States";
import { getDictionary } from "@/i18n/server";
import { getSessionWithRole } from "@/lib/auth/session";
import { liveCustomerOrders } from "@/lib/data/customer-live";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).orders.myOrders };
}

export const instant = false;

export default async function OrdersPage() {
  const t = await getDictionary();
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold tracking-tight sm:text-3xl">{t.orders.myOrders}</h1>
      <Suspense fallback={<Skeleton className="mt-6 h-64" />}>
        <RoleGate role="customer">
          <OrderList />
        </RoleGate>
      </Suspense>
    </div>
  );
}

async function OrderList() {
  const t = await getDictionary();
  const orders = await liveCustomerOrders(await getSessionWithRole("customer"));

  return (
    <CustomerOrdersList
      orders={orders}
      labels={{
        noOrders: t.orders.noOrders,
        startShopping: t.cart.startShopping,
        item: t.common.item,
        items: t.common.items,
        more: t.orders.more,
      }}
    />
  );
}
