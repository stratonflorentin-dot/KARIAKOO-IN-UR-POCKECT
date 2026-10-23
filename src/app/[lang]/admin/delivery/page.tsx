import type { Metadata } from "next";
import Link from "@/components/i18n/Link";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/States";
import { TableCard, THead, Th, tbodyClass, tdClass } from "@/components/ui/Table";
import { CreateSettlementForm, MarkSettlementPaidForm } from "@/components/admin/SettlementActions";
import { requireRole } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDate, formatDateTime, formatTzs } from "@/lib/format";
import { darDate } from "@/lib/rider-earnings";

export const metadata: Metadata = { title: "Delivery operations" };
export default async function AdminDeliveryPage() {
  await requireRole("admin");
  const sb = await createSupabaseServerClient();
  const [deliveryResult, riderResult, settlementResult] = await Promise.all([
    sb.from("deliveries").select("order_id,rider_id,status,rider_payout_tzs,updated_at,orders(reference,customer_id,created_at),riders(profiles(full_name,phone))").order("updated_at", { ascending: false }).limit(200),
    sb.from("riders").select("id,status,profiles(full_name)").eq("status", "approved"),
    sb.from("rider_settlements").select("id,rider_id,period_date,deliveries_count,gross_tzs,status,created_at").order("period_date", { ascending: false }).limit(200),
  ]);
  if (deliveryResult.error || riderResult.error || settlementResult.error) throw new Error(`Could not load delivery operations: ${deliveryResult.error?.message ?? riderResult.error?.message ?? settlementResult.error?.message}`);
  const deliveries = (deliveryResult.data ?? []) as unknown as { order_id: string; rider_id: string | null; status: string; rider_payout_tzs: number; updated_at: string; orders: { reference: string; customer_id: string; created_at: string } | null; riders: { profiles: { full_name: string; phone: string | null } | null } | null }[];
  const riders = (riderResult.data ?? []) as unknown as { id: string; status: string; profiles: { full_name: string } | null }[];
  const settlements = (settlementResult.data ?? []) as unknown as { id: string; rider_id: string; period_date: string; deliveries_count: number; gross_tzs: number; status: string; created_at: string }[];
  const riderNameById = new Map(riders.map((r) => [r.id, r.profiles?.full_name || "Rider"]));
  const active = deliveries.filter((d) => ["PENDING_ASSIGNMENT", "ASSIGNED", "ACCEPTED", "PICKED_UP", "IN_TRANSIT", "FAILED"].includes(d.status));
  return <>
    <PageHeader title="Delivery operations" description="Monitor the active dispatch queue and reconcile rider payouts. Rider location is only shown on the protected order view for fresh active deliveries." />
    <CreateSettlementForm riders={riders.map((r) => ({ id: r.id, name: r.profiles?.full_name || "Rider" }))} date={darDate(new Date().toISOString())} />
    <section className="mt-6"><h2 className="mb-3 text-lg font-semibold">Dispatch and active deliveries</h2>{active.length ? <TableCard label="Active delivery queue" minWidth="56rem"><THead><Th>Order</Th><Th>Customer</Th><Th>Rider</Th><Th>Delivery state</Th><Th>Last update</Th><Th align="right">Rider payout</Th></THead><tbody className={tbodyClass}>{active.map((d) => <tr key={d.order_id}><th scope="row" className={tdClass}><Link href={`/admin/orders/${d.order_id}`} className="font-medium text-brand-700 underline">{d.orders?.reference ?? d.order_id.slice(0, 8)}</Link></th><td className={tdClass}>{d.orders?.customer_id.slice(0, 8) ?? "—"}</td><td className={tdClass}>{d.riders?.profiles?.full_name || (d.rider_id ? "Assigned rider" : "Unassigned")}</td><td className={tdClass}><Badge tone={d.status === "FAILED" ? "danger" : "info"}>{d.status.replaceAll("_", " ")}</Badge></td><td className={tdClass}>{formatDateTime(d.updated_at)}</td><td className={`${tdClass} text-right tabular-nums`}>{formatTzs(Number(d.rider_payout_tzs))}</td></tr>)}</tbody></TableCard> : <EmptyState title="No active deliveries" body="New queued and active deliveries will appear here." />}</section>
    <section className="mt-8"><h2 className="mb-3 text-lg font-semibold">Rider settlements</h2>{settlements.length ? <TableCard label="Rider settlement ledger" minWidth="54rem"><THead><Th>Date</Th><Th>Rider</Th><Th align="right">Deliveries</Th><Th align="right">Gross payout</Th><Th>Status</Th><Th>Action</Th></THead><tbody className={tbodyClass}>{settlements.map((s) => <tr key={s.id}><td className={tdClass}>{formatDate(s.period_date)}</td><th scope="row" className={tdClass}>{riderNameById.get(s.rider_id) ?? "Rider"}</th><td className={`${tdClass} text-right tabular-nums`}>{s.deliveries_count}</td><td className={`${tdClass} text-right tabular-nums`}>{formatTzs(Number(s.gross_tzs))}</td><td className={tdClass}><Badge tone={s.status === "paid" ? "success" : "warning"}>{s.status}</Badge></td><td className={tdClass}>{s.status === "pending" ? <MarkSettlementPaidForm id={s.id} /> : <span className="text-xs text-muted">Paid {s.created_at ? formatDateTime(s.created_at) : ""}</span>}</td></tr>)}</tbody></TableCard> : <EmptyState title="No rider settlements yet" body="Create a settlement after deliveries are completed and reconciled." />}</section>
  </>;
}
