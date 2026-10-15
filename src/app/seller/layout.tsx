import type { Metadata } from "next";
import { DashboardFrame } from "@/components/dashboard/DashboardFrame";
import type { NavItem } from "@/components/dashboard/SidebarNav";

export const metadata: Metadata = {
  title: { default: "Seller centre", template: "%s · Seller · KARIAKOO" },
  robots: { index: false, follow: false },
};

// Every page in this area needs a signed-in session, so it is rendered per
// request. Opt out of build-time instant-navigation validation, which renders
// without a session (and would just see the access check's 404).
export const instant = false;

const nav: NavItem[] = [
  { label: "Dashboard", icon: "overview", href: "/seller", exact: true },
  { label: "Orders", icon: "orders", href: "/seller/orders" },
  { label: "Products", icon: "products", href: "/seller/products" },
  { label: "Finances & commission", icon: "finances", href: "/seller/finances" },
  { label: "Inventory history", icon: "inventory", phase: 3 },
  { label: "Shop profile", icon: "shop", phase: 3 },
  { label: "Notifications", icon: "notifications", phase: 3 },
  { label: "Support", icon: "support", phase: 3 },
];

export default function SellerLayout({ children }: LayoutProps<"/seller">) {
  return (
    <DashboardFrame role="seller" title="Seller centre" tone="light" nav={nav}>
      {children}
    </DashboardFrame>
  );
}
