import type { Metadata } from "next";
import { SellerAppShell } from "@/components/dashboard/SellerAppShell";
import type { SellerTab } from "@/components/dashboard/SellerTabBar";
import { getDictionary } from "@/i18n/server";

export const metadata: Metadata = {
  title: { default: "Seller centre", template: "%s · Seller · KARIAKOO" },
  robots: { index: false, follow: false },
};

// Every page in this area needs a signed-in session, so it is rendered per
// request. Opt out of build-time instant-navigation validation, which renders
// without a session (and would just see the access check's 404).
export const instant = false;

export default async function SellerLayout({ children }: LayoutProps<"/[lang]/seller">) {
  const t = await getDictionary();
  const s = t.dash.seller;
  const tabs: SellerTab[] = [
    { label: s.dashboard, icon: "overview", href: "/seller", exact: true },
    { label: s.orders, icon: "orders", href: "/seller/orders" },
    { label: s.products, icon: "products", href: "/seller/products" },
    { label: s.advertising, icon: "advertising", href: "/seller/advertising" },
    { label: s.finances, icon: "finances", href: "/seller/finances" },
  ];
  return (
    <SellerAppShell title={t.dash.sellerCentre} tabs={tabs}>
      {children}
    </SellerAppShell>
  );
}
