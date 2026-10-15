import type { Metadata } from "next";
import { SellerProductsManager } from "@/components/dashboard/SellerProductsManager";
import { PageHeader } from "@/components/ui/Card";
import { Notice } from "@/components/ui/States";
import { requireRole } from "@/lib/auth/session";
import { getCategories } from "@/lib/catalog";
import { sellerProducts, sellerShop } from "@/lib/data/access";

export const metadata: Metadata = { title: "Products" };

export default async function SellerProductsPage() {
  const session = await requireRole("seller");
  const shop = sellerShop(session);
  const rows = sellerProducts(session).map(({ id, slug, name, category, priceTzs, stock, status, description, audience, productType, imageUrl }) => ({
    id, slug, name, category, priceTzs, stock, status, description, audience, productType, imageUrl,
  }));
  const categories = getCategories().filter((c) => shop?.categories.includes(c.slug));

  return (
    <>
      <PageHeader title="Products" description="Add products with a photo and description, see exactly how customers will see them, and manage price, stock and availability." />
      <div className="mb-4">
        <Notice tone="warning">Demo preview: changes stay in this browser tab and reset when you reload. Nothing is saved.</Notice>
      </div>
      <SellerProductsManager initialProducts={rows} categories={categories} shopName={shop?.name ?? "Your shop"} />
    </>
  );
}
