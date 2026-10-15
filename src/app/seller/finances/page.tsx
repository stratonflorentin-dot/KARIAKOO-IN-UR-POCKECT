import { Download } from "lucide-react";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/Badge";
import { Card, PageHeader, StatCard } from "@/components/ui/Card";
import { TableCard, THead, Th, tbodyClass, tdClass } from "@/components/ui/Table";
import { buttonClasses } from "@/components/ui/Button";
import { requireRole } from "@/lib/auth/session";
import { sellerOrders } from "@/lib/data/access";
import { formatDate, formatTzs } from "@/lib/format";
import { breakdown, formatBps } from "@/lib/money";

export const metadata: Metadata = { title: "Finances & commission" };

const settlementLabel = { not_due: "Not due yet", pending: "Pending settlement", settled: "Settled" } as const;
const settlementTone = { not_due: "neutral", pending: "warning", settled: "success" } as const;

export default async function SellerFinancesPage() {
  const orders = sellerOrders(await requireRole("seller"));
  const sales = orders.filter((o) => o.paymentStatus === "successful" && !["rejected", "cancelled"].includes(o.group.status));
  const refunded = orders.filter((o) => o.paymentStatus === "refunded");
  const gmv = breakdown(sales.flatMap((o) => o.items));
  const delivered = sales.filter((o) => o.group.status === "delivered");
  const settled = breakdown(delivered.filter((o) => o.group.settlement === "settled").flatMap((o) => o.items));
  const pendingSettlement = breakdown(delivered.filter((o) => o.group.settlement === "pending").flatMap((o) => o.items));

  return (
    <>
      <PageHeader
        title="Finances & commission"
        description="Customers pay KARIAKOO. After delivery is confirmed, we pay you the merchandise total minus commission. Delivery fees are not part of your sales."
        actions={
          <a href="/seller/finances/export" className={buttonClasses({ variant: "outline" })} download>
            <Download size={16} aria-hidden="true" /> Download CSV
          </a>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Gross merchandise value" value={formatTzs(gmv.merchandiseTzs)} hint="Paid sales, before commission" />
        <StatCard label="Commission charged" value={formatTzs(gmv.commissionTzs)} />
        <StatCard label="Refunds & adjustments" value={formatTzs(0)} hint={`${refunded.length} order(s) refunded before dispatch`} />
        <StatCard label="Pending settlement" value={formatTzs(pendingSettlement.sellerProceedsTzs)} hint="Delivered, awaiting payout" />
        <StatCard label="Settled to you" value={formatTzs(settled.sellerProceedsTzs)} />
      </div>

      <Card className="mt-6" aria-labelledby="how-commission">
        <h2 id="how-commission" className="font-semibold">How commission is calculated</h2>
        <p className="mt-2 text-sm text-muted">
          Commission = merchandise subtotal × the rate in force <strong>when the order was placed</strong>, rounded to the nearest shilling.
          Delivery charges are excluded. If KARIAKOO changes its rate later, your past orders keep their original rate.
        </p>
        <p className="mt-2 rounded-xl bg-subtle p-3 text-sm">
          Example: TSh 100,000 of goods at 10% → commission TSh 10,000 → <strong>you receive TSh 90,000</strong>.
        </p>
      </Card>

      <div className="mt-6">
        <TableCard label="Commission by order" minWidth="52rem">
          <THead><Th>Order</Th><Th align="right">Merchandise</Th><Th align="right">Rate</Th><Th align="right">Commission</Th><Th align="right">Your proceeds</Th><Th>Settlement</Th></THead>
          <tbody className={tbodyClass}>
            {orders.map((o) => {
              const b = breakdown(o.items);
              const excluded = o.paymentStatus !== "successful" || ["rejected", "cancelled"].includes(o.group.status);
              return (
                <tr key={o.orderId} className={excluded ? "text-muted" : ""}>
                  <th scope="row" className={`${tdClass} font-medium`}>
                    {o.reference}
                    <span className="block text-xs font-normal text-muted">{formatDate(o.placedAt)}</span>
                  </th>
                  <td className={`${tdClass} text-right tabular-nums`}>{formatTzs(b.merchandiseTzs)}</td>
                  <td className={`${tdClass} text-right tabular-nums`}>{formatBps(o.items[0].commissionBps)}</td>
                  <td className={`${tdClass} text-right tabular-nums`}>{excluded ? "—" : `−${formatTzs(b.commissionTzs)}`}</td>
                  <td className={`${tdClass} text-right font-semibold tabular-nums`}>{excluded ? "—" : formatTzs(b.sellerProceedsTzs)}</td>
                  <td className={tdClass}>
                    {excluded ? <Badge>{o.paymentStatus === "refunded" ? "Refunded" : "Not paid yet"}</Badge> : <Badge tone={settlementTone[o.group.settlement]}>{settlementLabel[o.group.settlement]}</Badge>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </TableCard>
      </div>
    </>
  );
}
