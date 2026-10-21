import type { Metadata } from "next";
import { DashboardFrame } from "@/components/dashboard/DashboardFrame";
import type { NavItem } from "@/components/dashboard/SidebarNav";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin · KARIAKOO" },
  robots: { index: false, follow: false },
};

// Every page in this area needs a signed-in session, so it is rendered per
// request. Opt out of build-time instant-navigation validation, which renders
// without a session (and would just see the access check's 404).
export const instant = false;

const nav: NavItem[] = [
  { label: "Overview", icon: "overview", href: "/admin", exact: true },
  { label: "Orders", icon: "orders", href: "/admin/orders" },
  { label: "Businesses", icon: "shop", href: "/admin/shops" },
  { label: "Riders", icon: "riders", href: "/admin/riders" },
  { label: "Customers", icon: "customers", href: "/admin/customers" },
  { label: "Products", icon: "products", href: "/admin/products" },
  { label: "Commission", icon: "commission", href: "/admin/commission" },
  { label: "Payments & settlements", icon: "payments", phase: 5 },
  { label: "Delivery management", icon: "delivery", phase: 6 },
  { label: "Disputes & refunds", icon: "disputes", phase: 5 },
  { label: "Analytics & reports", icon: "analytics", phase: 5 },
  { label: "Platform settings", icon: "settings", phase: 5 },
  { label: "Admin users & security", icon: "security", phase: 2 },
];

export default function AdminLayout({ children }: LayoutProps<"/[lang]/admin">) {
  return (
    <DashboardFrame role="admin" title="Founder control centre" tone="dark" nav={nav} searchable>
      {children}
    </DashboardFrame>
  );
}
