import type { Metadata } from "next";
import Link from "next/link";
import { LiveModerationActions } from "@/components/dashboard/LiveModerationActions";
import { ModerationActions } from "@/components/dashboard/ModerationActions";
import { ShopKindBadge } from "@/components/shop/ShopMark";
import { PageHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/States";
import { TableCard, THead, Th, tbodyClass, tdClass } from "@/components/ui/Table";
import { requireRole } from "@/lib/auth/session";
import { adminData } from "@/lib/data/access";
import { liveShopApplications } from "@/lib/data/applications";
import { getCategory } from "@/lib/catalog";
import { formatTzs } from "@/lib/format";
import { breakdown } from "@/lib/money";

export const metadata: Metadata = { title: "Businesses" };

const tones = { approved: "success", pending: "warning", rejected: "danger", suspended: "danger" } as const;
const options = {
  pending: [{ to: "approved", label: "Approve" }, { to: "rejected", label: "Reject", danger: true }],
  approved: [{ to: "suspended", label: "Suspend", danger: true }],
  suspended: [{ to: "approved", label: "Reactivate" }],
  rejected: [{ to: "pending", label: "Reopen application" }],
};

export default async function AdminShopsPage() {
  const session = await requireRole("admin");
  const { shops, products, orders } = adminData(session);
  const applications = await liveShopApplications(session);

  return (
    <>
      <PageHeader title="Businesses" description="Review applications, verify shops, and suspend or reactivate with a recorded reason. Only approved shops appear in the store." />

      <section className="mb-8">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Live applications</h2>
        {applications.length === 0 ? (
          <EmptyState title="No seller applications yet" body="When someone applies to sell through the app, their shop appears here for review." />
        ) : (
          <TableCard label="Seller applications" minWidth="48rem">
            <THead><Th>Shop</Th><Th>Category</Th><Th>Area</Th><Th>Status & actions</Th></THead>
            <tbody className={tbodyClass}>
              {applications.map((a) => (
                <tr key={a.id}>
                  <th scope="row" className={`${tdClass} font-medium`}>
                    {a.name}
                    <span className="block text-xs font-normal text-muted">{a.address}</span>
                  </th>
                  <td className={tdClass}>{getCategory(a.category)?.name ?? a.category}</td>
                  <td className={`${tdClass} capitalize`}>{a.area}</td>
                  <td className={tdClass}>
                    <LiveModerationActions kind="shop" id={a.id} subject={a.name} status={a.status} statusTones={tones} options={options} />
                  </td>
                </tr>
              ))}
            </tbody>
          </TableCard>
        )}
      </section>

      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Demo marketplace</h2>
      <TableCard label="Shops" minWidth="60rem">
        <THead><Th>Shop</Th><Th>Type</Th><Th align="right">Products</Th><Th align="right">Paid sales</Th><Th>Verified</Th><Th>Status & actions</Th></THead>
        <tbody className={tbodyClass}>
          {shops.map((s) => {
            const sales = breakdown(orders.filter((o) => o.paymentStatus === "successful" && o.status !== "cancelled").flatMap((o) => o.items.filter((i) => i.shopId === s.id)));
            return (
              <tr key={s.id}>
                <th scope="row" className={`${tdClass} font-medium`}>
                  {s.status === "approved" ? <Link href={`/customer/shops/${s.slug}`} className="hover:underline">{s.name}</Link> : s.name}
                  <span className="block text-xs font-normal text-muted">{s.address} · since {s.joinedYear}</span>
                </th>
                <td className={tdClass}><ShopKindBadge shop={s} /></td>
                <td className={`${tdClass} text-right tabular-nums`}>{products.filter((p) => p.shopId === s.id).length}</td>
                <td className={`${tdClass} text-right tabular-nums`}>{formatTzs(sales.merchandiseTzs)}</td>
                <td className={tdClass}>{s.verified ? "Yes" : "No"}</td>
                <td className={tdClass}><ModerationActions subject={s.name} initialStatus={s.status} statusTones={tones} options={options} /></td>
              </tr>
            );
          })}
        </tbody>
      </TableCard>
    </>
  );
}
