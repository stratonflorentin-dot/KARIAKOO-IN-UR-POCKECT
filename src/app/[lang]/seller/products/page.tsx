import type { Metadata } from "next";
import { SellerProductsManager } from "@/components/dashboard/SellerProductsManager";
import { ButtonLink } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/Card";
import { EmptyState, Notice } from "@/components/ui/States";
import { getDictionary } from "@/i18n/server";
import { requireRole } from "@/lib/auth/session";
import { getCategories } from "@/lib/catalog";
import { liveSellerProducts, liveSellerShop } from "@/lib/data/seller-live";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).dash.seller.products };
}

export default async function SellerProductsPage() {
  const t = await getDictionary();
  const sp = t.sellerProducts;
  const session = await requireRole("seller");
  const shop = await liveSellerShop(session);

  if (!shop) {
    return (
      <>
        <PageHeader title={t.dash.seller.products} description={sp.noShopDesc} />
        <EmptyState
          title={t.seller.setUpFirst}
          body={sp.noShopBody}
          action={<ButtonLink href="/apply/seller" variant="dark">{t.seller.setUpShop}</ButtonLink>}
        />
      </>
    );
  }

  const products = await liveSellerProducts(session, shop.id);

  return (
    <>
      <PageHeader title={t.dash.seller.products} description={sp.pageDesc} />
      {shop.status !== "approved" && (
        <div className="mb-4">
          <Notice tone="warning">{sp.notApproved}</Notice>
        </div>
      )}
      <SellerProductsManager initialProducts={products} categories={getCategories()} shopName={shop.name} />
    </>
  );
}
