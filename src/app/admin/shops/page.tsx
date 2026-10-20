import type { Metadata } from "next";
import { LiveModerationActions } from "@/components/dashboard/LiveModerationActions";
import { PageHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/States";
import { TableCard, THead, Th, tbodyClass, tdClass } from "@/components/ui/Table";
import { requireRole } from "@/lib/auth/session";
import { liveShopApplications } from "@/lib/data/applications";
import { getCategory } from "@/lib/catalog";

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

    </>
  );
}
