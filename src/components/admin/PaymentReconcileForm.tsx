"use client";

import { useActionState } from "react";
import { recordAdminPayment, type AdminActionResult } from "@/app/[lang]/admin/actions";

type OrderOption = { id: string; reference: string; paymentStatus: string; totalTzs: number };
const initial: AdminActionResult = { status: "idle" };

export function PaymentReconcileForm({ orders }: { orders: OrderOption[] }) {
  const [state, action, pending] = useActionState(recordAdminPayment, initial);
  return (
    <form action={action} className="grid gap-3 rounded-2xl border border-line bg-subtle p-4 md:grid-cols-2">
      <div className="md:col-span-2"><h2 className="font-semibold">Record a verified payment event</h2><p className="mt-1 text-sm text-muted">Use only after confirming the provider or cash record. Ledger entries cannot be edited or deleted.</p></div>
      <label className="text-sm font-medium">Order<select name="orderId" required defaultValue="" className="mt-1 h-11 w-full rounded-xl border border-line bg-white px-3"><option value="" disabled>Select order</option>{orders.map((order) => <option key={order.id} value={order.id}>{order.reference} · {order.paymentStatus} · TSh {order.totalTzs.toLocaleString("en-TZ")}</option>)}</select></label>
      <label className="text-sm font-medium">Provider<select name="provider" className="mt-1 h-11 w-full rounded-xl border border-line bg-white px-3"><option value="mpesa">M-Pesa</option><option value="mixx">Mixx</option><option value="airtelmoney">Airtel Money</option><option value="halopesa">HaloPesa</option><option value="cod">Cash on delivery</option></select></label>
      <label className="text-sm font-medium">Ledger event<select name="kind" className="mt-1 h-11 w-full rounded-xl border border-line bg-white px-3"><option value="initiated">Initiated</option><option value="succeeded">Payment verified</option><option value="failed">Payment failed</option><option value="refunded">Refund issued</option><option value="cod_collected">COD collected</option></select></label>
      <label className="text-sm font-medium">Amount (TSh)<input name="amount" type="number" min="0" step="1" required inputMode="numeric" className="mt-1 h-11 w-full rounded-xl border border-line bg-white px-3" /></label>
      <label className="text-sm font-medium">Provider reference (if available)<input name="reference" maxLength={160} className="mt-1 h-11 w-full rounded-xl border border-line bg-white px-3" /></label>
      <label className="text-sm font-medium">Reconciliation note<input name="note" required maxLength={500} className="mt-1 h-11 w-full rounded-xl border border-line bg-white px-3" placeholder="Reference checked against provider statement" /></label>
      <div className="flex flex-wrap items-center gap-3 md:col-span-2"><button disabled={pending || !orders.length} className="h-11 rounded-full bg-night px-5 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Recording…" : "Record event"}</button>{state.message && <p role={state.status === "error" ? "alert" : "status"} className={`text-sm ${state.status === "error" ? "text-red-700" : "text-emerald-800"}`}>{state.message}</p>}</div>
    </form>
  );
}
