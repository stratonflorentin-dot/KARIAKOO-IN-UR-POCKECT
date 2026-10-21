import type { Metadata } from "next";
import { LiveModerationActions } from "@/components/dashboard/LiveModerationActions";
import { PageHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/States";
import { TableCard, THead, Th, tbodyClass, tdClass } from "@/components/ui/Table";
import { requireRole } from "@/lib/auth/session";
import { liveRiderApplications } from "@/lib/data/applications";
import { getZone, isDeliveryZoneId } from "@/lib/delivery";
import { formatTzPhone } from "@/lib/validation/checkout";

export const metadata: Metadata = { title: "Riders" };

const tones = { approved: "success", pending: "warning", rejected: "danger", suspended: "danger" } as const;
const options = {
  pending: [{ to: "approved", label: "Approve" }, { to: "rejected", label: "Reject", danger: true }],
  approved: [{ to: "suspended", label: "Suspend", danger: true }],
  suspended: [{ to: "approved", label: "Reactivate" }],
  rejected: [{ to: "pending", label: "Reopen" }],
};

export default async function AdminRidersPage() {
  const session = await requireRole("admin");
  const applications = await liveRiderApplications(session);

  return (
    <>
      <PageHeader title="Riders" description="Approve applications, monitor active deliveries and incidents, and suspend riders with a documented reason." />

      <section className="mb-8">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Live applications</h2>
        {applications.length === 0 ? (
          <EmptyState title="No rider applications yet" body="When someone applies to ride through the app, they appear here for review." />
        ) : (
          <TableCard label="Rider applications" minWidth="48rem">
            <THead><Th>Rider</Th><Th>Vehicle</Th><Th>Base area</Th><Th>Status & actions</Th></THead>
            <tbody className={tbodyClass}>
              {applications.map((a) => (
                <tr key={a.id}>
                  <th scope="row" className={`${tdClass} font-medium`}>
                    {a.name}
                    {a.phone && <span className="block text-xs font-normal text-muted">{formatTzPhone(a.phone)}</span>}
                  </th>
                  <td className={tdClass}>{a.vehicle}<span className="block text-xs text-muted">{a.plate}</span></td>
                  <td className={tdClass}>{isDeliveryZoneId(a.baseZone) ? getZone(a.baseZone).name.split(" (")[0] : a.baseZone}</td>
                  <td className={tdClass}>
                    <LiveModerationActions kind="rider" id={a.id} subject={a.name} status={a.status} statusTones={tones} options={options} />
                  </td>
                </tr>
              ))}
            </tbody>
          </TableCard>
        )}
      </section>

      <p className="text-sm text-muted">Live rider accounts and delivery performance will appear here once approved rider operations are connected.</p>
    </>
  );
}
