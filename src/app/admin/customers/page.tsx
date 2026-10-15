import type { Metadata } from "next";
import { ModerationActions } from "@/components/dashboard/ModerationActions";
import { PageHeader } from "@/components/ui/Card";
import { TableCard, THead, Th, tbodyClass, tdClass } from "@/components/ui/Table";
import { requireRole } from "@/lib/auth/session";
import { adminData } from "@/lib/data/access";
import { formatDate, formatTzs } from "@/lib/format";
import { orderTotals } from "@/lib/money";
import { formatTzPhone } from "@/lib/validation/checkout";

export const metadata: Metadata = { title: "Customers" };

const tones = { active: "success", suspended: "danger" } as const;
const options = {
  active: [{ to: "suspended", label: "Suspend", danger: true }],
  suspended: [{ to: "active", label: "Reactivate" }],
};

export default async function AdminCustomersPage() {
  const { customers, orders } = adminData(await requireRole("admin"));

  return (
    <>
      <PageHeader title="Customers" description="Account information relevant to orders and support. Suspensions require a recorded reason." />
      <TableCard label="Customers" minWidth="52rem">
        <THead><Th>Customer</Th><Th>Joined</Th><Th align="right">Orders</Th><Th align="right">Paid spend</Th><Th>Status & actions</Th></THead>
        <tbody className={tbodyClass}>
          {customers.map((c) => {
            const theirs = orders.filter((o) => o.customerId === c.id);
            const spend = theirs.filter((o) => o.paymentStatus === "successful").reduce((s, o) => s + orderTotals(o.items, o.deliveryFeeTzs).customerTotalTzs, 0);
            return (
              <tr key={c.id}>
                <th scope="row" className={`${tdClass} font-medium`}>
                  {c.name}
                  <span className="block text-xs font-normal text-muted">{formatTzPhone(c.phone)} · {c.email}</span>
                </th>
                <td className={tdClass}>{formatDate(c.joinedAt)}</td>
                <td className={`${tdClass} text-right tabular-nums`}>{theirs.length}</td>
                <td className={`${tdClass} text-right tabular-nums`}>{formatTzs(spend)}</td>
                <td className={tdClass}><ModerationActions subject={c.name} initialStatus={c.status} statusTones={tones} options={options} /></td>
              </tr>
            );
          })}
        </tbody>
      </TableCard>
    </>
  );
}
