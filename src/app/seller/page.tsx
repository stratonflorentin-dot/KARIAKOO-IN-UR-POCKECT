import { AlertTriangle, BadgeCheck, ClipboardList, Megaphone, Package, Plus, Receipt, Timer } from "lucide-react";
import Link from "next/link";
import { Card, CardHeader, PageHeader, StatCard } from "@/components/ui/Card";
import { requireRole } from "@/lib/auth/session";
import { liveSellerProducts, liveSellerShop, liveSellerSummary } from "@/lib/data/seller-live";

export default async function SellerDashboardPage() {
  const session = await requireRole("seller");
  const shop = await liveSellerShop(session);
  if (!shop) {
    return (
      <>
        <PageHeader title="Seller dashboard" description="Your account does not have a shop yet." />
        <Link className="text-sm font-medium text-brand-700 hover:underline" href="/apply/seller">Set up your shop</Link>
      </>
    );
  }
  const [summary, products] = await Promise.all([liveSellerSummary(session, shop.id), liveSellerProducts(session, shop.id)]);
  const verified = shop.status === "approved";

  const actions = [
    { href: "/seller/products", Icon: Package, title: "My products", sub: `${summary.productCount} listed` },
    { href: "/seller/products", Icon: Plus, title: "Add product", sub: "Create a new listing" },
    { href: "/seller/orders", Icon: ClipboardList, title: "Orders", sub: summary.pendingOrders ? `${summary.pendingOrders} need action` : "Manage orders" },
    { href: "/seller/advertising", Icon: Megaphone, title: "Advertise", sub: "Promote your shop" },
    { href: "/seller/finances", Icon: Receipt, title: "Finances", sub: "Proceeds & commission" },
  ];

  return (
    <>
      {/* Greeting + verification status (reference: "Hello, …" + Verified Seller). */}
      <div className="flex items-center gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-600 text-lg font-bold text-white" aria-hidden="true">
          {shop.name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl">Hello, {shop.name}</h1>
          {verified ? (
            <span className="mt-0.5 inline-flex items-center gap-1 text-sm font-semibold text-brand-700">
              <BadgeCheck size={15} aria-hidden="true" /> Verified seller
            </span>
          ) : (
            <span className="mt-0.5 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
              Shop {shop.status} — awaiting approval
            </span>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Products" value={String(summary.productCount)} hint={`${summary.activeProducts} active`} icon={<Package size={18} />} />
        <StatCard label="Pending orders" value={String(summary.pendingOrders)} hint="Awaiting fulfilment" icon={<Timer size={18} />} />
        <StatCard label="All orders" value={String(summary.orderCount)} hint="Containing your products" icon={<ClipboardList size={18} />} />
        <StatCard label="Low stock" value={String(summary.lowStock)} hint="5 or fewer in stock" icon={<AlertTriangle size={18} />} />
      </div>

      <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-muted">Quick actions</h2>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {actions.map(({ href, Icon, title, sub }) => (
          <li key={title}>
            <Link href={href} className="flex h-full items-start gap-3 rounded-2xl border border-line bg-white p-4 transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-sm">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700"><Icon size={18} aria-hidden="true" /></span>
              <span className="min-w-0">
                <span className="block font-semibold">{title}</span>
                <span className="block text-xs text-muted">{sub}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <Card className="mt-8" aria-labelledby="inventory">
        <CardHeader id="inventory" title="Inventory" action={<Link href="/seller/products" className="text-sm font-medium text-brand-700 hover:underline">Manage products</Link>} />
        {products.length === 0 ? (
          <p className="text-sm text-muted">No products listed yet. Use “Add product” above to create your first listing.</p>
        ) : (
          <ul className="divide-y divide-line text-sm">
            {products.slice(0, 8).map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                <span className="font-medium">{p.name}</span>
                <span className="text-muted">{p.stock} in stock · {p.status}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
