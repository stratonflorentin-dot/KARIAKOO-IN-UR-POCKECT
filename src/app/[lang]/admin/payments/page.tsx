import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/States";
import { PageHeader } from "@/components/ui/Card";
import { TableCard, THead, Th, tbodyClass, tdClass } from "@/components/ui/Table";
import { PaymentReconcileForm } from "@/components/admin/PaymentReconcileForm";
import { requireRole } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDateTime, formatTzs } from "@/lib/format";

export const metadata: Metadata = { title: "Payments" };
export default async function AdminPaymentsPage() {
  await requireRole("admin");
  const sb = await createSupabaseServerClient();
  const [{ data: txs, error: txError }, { data: orders, error: orderError }] = await Promise.all([
    sb.from("payment_transactions").select("id,order_id,provider,kind,amount_tzs,provider_ref,note,created_at").order("created_at", { ascending: false }).limit(200),
    sb.from("orders").select("id,reference,payment_status,delivery_fee_tzs,order_items(unit_price_tzs,quantity)").order("created_at", { ascending: false }).limit(200),
  ]);
  if (txError || orderError) throw new Error(`Could not load payment operations: ${txError?.message ?? orderError?.message}`);
  const orderRows = (orders ?? []) as unknown as { id: string; reference: string; payment_status: string; delivery_fee_tzs: number; order_items: { unit_price_tzs: number; quantity: number }[] }[];
  const opts = orderRows.map((o) => ({ id: o.id, reference: o.reference, paymentStatus: o.payment_status, totalTzs: o.order_items.reduce((s, i) => s + Number(i.unit_price_tzs) * i.quantity, 0) + Number(o.delivery_fee_tzs) }));
  const refs = new Map(orderRows.map((o) => [o.id, o.reference]));
  const txRows = (txs ?? []) as unknown as { id: string; order_id: string; provider: string; kind: string; amount_tzs: number; provider_ref: string | null; note: string; created_at: string }[];
  return <>
    <PageHeader title="Payment operations" description="Review the immutable transaction ledger and record provider-verified or cash reconciliation events. Recording an event changes the order payment state through a validated database function." />
    <PaymentReconcileForm orders={opts} />
    <section className="mt-6">{txRows.length ? <TableCard label="Payment ledger" minWidth="60rem"><THead><Th>Recorded</Th><Th>Order</Th><Th>Provider / event</Th><Th>Reference</Th><Th>Audit note</Th><Th align="right">Amount</Th></THead><tbody className={tbodyClass}>{txRows.map((x) => <tr key={x.id}><td className={tdClass}>{formatDateTime(x.created_at)}</td><th scope="row" className={tdClass}>{refs.get(x.order_id) ?? "Order"}</th><td className={`${tdClass} capitalize`}>{x.provider.replaceAll("_", " ")}<span className="block text-xs text-muted">{x.kind.replaceAll("_", " ")}</span></td><td className={tdClass}>{x.provider_ref ?? "—"}</td><td className={tdClass}>{x.note}</td><td className={`${tdClass} text-right tabular-nums`}>{formatTzs(Number(x.amount_tzs))}</td></tr>)}</tbody></TableCard> : <EmptyState title="No payment events recorded" body="Verified reconciliation events will appear here." />}</section>
  </>;
}
