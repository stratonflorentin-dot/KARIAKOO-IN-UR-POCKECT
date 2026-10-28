import type { Metadata } from "next";
import { DashboardFrame } from "@/components/dashboard/DashboardFrame";
import type { NavItem } from "@/components/dashboard/SidebarNav";
import { getDictionary } from "@/i18n/server";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin · KARIAKOO" },
  robots: { index: false, follow: false },
};

// Every page in this area needs a signed-in session, so it is rendered per
// request. Opt out of build-time instant-navigation validation, which renders
// without a session (and would just see the access check's 404).
export const instant = false;

export default async function AdminLayout({ children }: LayoutProps<"/[lang]/admin">) {
  const t = await getDictionary();
  const a = t.dash.admin;
  const nav: NavItem[] = [
    { label: a.overview, icon: "overview", href: "/admin", exact: true },
    { label: a.orders, icon: "orders", href: "/admin/orders" },
    { label: a.businesses, icon: "shop", href: "/admin/shops" },
    { label: a.riders, icon: "riders", href: "/admin/riders" },
    { label: a.customers, icon: "customers", href: "/admin/customers" },
    { label: a.products, icon: "products", href: "/admin/products" },
    { label: a.commission, icon: "commission", href: "/admin/commission" },
    { label: a.pricing, icon: "payments", href: "/admin/pricing" },
    { label: a.payments, icon: "payments", href: "/admin/payments" },
    { label: a.delivery, icon: "delivery", href: "/admin/delivery" },
    { label: a.disputes, icon: "disputes", href: "/admin/disputes" },
    { label: a.analytics, icon: "analytics", href: "/admin/analytics" },
    { label: a.security, icon: "security", href: "/admin/security" },
  ];
  return (
    <DashboardFrame role="admin" title={t.dash.adminCentre} tone="dark" nav={nav} searchable>
      {children}
    </DashboardFrame>
  );
}
