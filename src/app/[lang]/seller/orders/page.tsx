import type { Metadata } from "next";
import { SellerOrdersManager } from "@/components/dashboard/SellerOrdersManager";
import { PageHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/States";
import { getDictionary } from "@/i18n/server";
import { requireRole } from "@/lib/auth/session";
import { liveSellerOrders, liveSellerShop } from "@/lib/data/seller-live";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).dash.seller.orders };
}

export default async function SellerOrdersPage() {
  const t = await getDictionary();
  const s = t.seller;
  const session = await requireRole("seller");
  const shop = await liveSellerShop(session);

  if (!shop) {
    return (
      <>
        <PageHeader title={s.ordersAction} description={s.ordersNoShopDesc} />
        <EmptyState title={s.setUpFirst} />
      </>
    );
  }

  const orders = await liveSellerOrders(session, shop.id);

  return (
    <>
      <PageHeader title={s.ordersAction} description={s.ordersDesc} />
      <div className="mt-6">
        <SellerOrdersManager
          orders={orders}
          labels={{
            colOrder: s.colOrder,
            colItems: s.colItems,
            colPayment: s.colPayment,
            colDelivery: s.colDelivery,
            colProceeds: s.colProceeds,
            colFulfilment: s.colFulfilment,
            afterCommission: s.afterCommission,
            noOrders: t.orders.noOrders,
            noOrdersBody: s.noOrdersBody,
            shopOrders: s.shopOrders,
          }}
        />
      </div>
    </>
  );
}
