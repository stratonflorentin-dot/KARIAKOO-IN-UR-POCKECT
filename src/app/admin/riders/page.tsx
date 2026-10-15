import type { Metadata } from "next";
import { ModerationActions } from "@/components/dashboard/ModerationActions";
import { DeliveryStatusBadge } from "@/components/orders/StatusBadges";
import { PageHeader } from "@/components/ui/Card";
import { TableCard, THead, Th, tbodyClass, tdClass } from "@/components/ui/Table";
import { requireRole } from "@/lib/auth/session";
import { adminData } from "@/lib/data/access";
import { getZone } from "@/lib/delivery";
import { formatTzs } from "@/lib/format";
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
  const { riders, orders } = adminData(await requireRole("admin"));

  return (
    <>
      <PageHeader title="Riders" description="Approve applications, monitor active deliveries and incidents, and suspend riders with a documented reason." />
      <TableCard label="Riders" minWidth="60rem">
        <THead><Th>Rider</Th><Th>Vehicle</Th><Th>Current job</Th><Th align="right">Delivered</Th><Th align="right">Failed</Th><Th align="right">Payouts</Th><Th>Status & actions</Th></THead>
        <tbody className={tbodyClass}>
          {riders.map((r) => {
            const jobs = orders.filter((o) => o.delivery.riderId === r.id);
            const active = jobs.find((o) => ["ASSIGNED", "ACCEPTED", "PICKED_UP", "IN_TRANSIT"].includes(o.delivery.status));
            const delivered = jobs.filter((o) => o.delivery.status === "DELIVERED");
            return (
              <tr key={r.id}>
                <th scope="row" className={`${tdClass} font-medium`}>
                  {r.name}
                  <span className="block text-xs font-normal text-muted">{formatTzPhone(r.phone)} · {getZone(r.baseZone).name.split(" (")[0]}</span>
                </th>
                <td className={tdClass}>{r.vehicle}<span className="block text-xs text-muted">{r.plate}</span></td>
                <td className={tdClass}>{active ? <>{active.reference} <DeliveryStatusBadge status={active.delivery.status} /></> : <span className="text-muted">None</span>}</td>
                <td className={`${tdClass} text-right tabular-nums`}>{delivered.length}</td>
                <td className={`${tdClass} text-right tabular-nums`}>{jobs.filter((o) => o.delivery.status === "FAILED").length}</td>
                <td className={`${tdClass} text-right tabular-nums`}>{formatTzs(delivered.reduce((s, o) => s + o.delivery.riderPayoutTzs, 0))}</td>
                <td className={tdClass}><ModerationActions subject={r.name} initialStatus={r.status} statusTones={tones} options={options} /></td>
              </tr>
            );
          })}
        </tbody>
      </TableCard>
    </>
  );
}
