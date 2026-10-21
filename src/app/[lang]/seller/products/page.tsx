import type { Metadata } from "next";
import { SellerProductsManager } from "@/components/dashboard/SellerProductsManager";
import { ButtonLink } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/Card";
import { EmptyState, Notice } from "@/components/ui/States";
import { requireRole } from "@/lib/auth/session";
import { getCategories } from "@/lib/catalog";
import { liveSellerProducts, liveSellerShop } from "@/lib/data/seller-live";

export const metadata: Metadata = { title: "Products" };

export default async function SellerProductsPage() {
  const session = await requireRole("seller");
  const shop = await liveSellerShop(session);

  if (!shop) {
    return (
      <>
        <PageHeader title="Products" description="List products, manage stock, and see how customers will see them." />
        <EmptyState
          title="Set up your shop first"
          body="You need an approved or pending shop before you can list products."
          action={<ButtonLink href="/apply/seller" variant="dark">Set up your shop</ButtonLink>}
        />
      </>
    );
  }

  const products = await liveSellerProducts(session, shop.id);

  return (
    <>
      <PageHeader title="Products" description="Add products with a description, see exactly how customers will see them, and manage price, stock and availability." />
      {shop.status !== "approved" && (
        <div className="mb-4">
          <Notice tone="warning">Your shop is {shop.status}. You can add products now — they go live to customers once your shop is approved.</Notice>
        </div>
      )}
      <SellerProductsManager initialProducts={products} categories={getCategories()} shopName={shop.name} />
    </>
  );
}
