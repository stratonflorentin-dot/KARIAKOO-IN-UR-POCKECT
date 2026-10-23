"use client";

import { useActionState } from "react";
import { markSettlementPaid, settleRiderDay, type AdminActionResult } from "@/app/[lang]/admin/actions";

const initial: AdminActionResult = { status: "idle" };
export function CreateSettlementForm({ riders, date }: { riders: { id: string; name: string }[]; date: string }) {
  const [state, action, pending] = useActionState(settleRiderDay, initial);
  return <form action={action} className="flex flex-wrap items-end gap-2 rounded-2xl border border-line bg-subtle p-4">
    <div className="w-full"><h2 className="font-semibold">Create daily rider settlement</h2><p className="mt-1 text-sm text-muted">Only delivered, unsettled orders for the selected Dar es Salaam date are included.</p></div>
    <label className="min-w-48 flex-1 text-sm font-medium">Rider<select name="riderId" required defaultValue="" className="mt-1 h-11 w-full rounded-xl border border-line bg-white px-3"><option value="" disabled>Select rider</option>{riders.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
    <label className="text-sm font-medium">Delivery date<input name="date" type="date" required defaultValue={date} className="mt-1 h-11 rounded-xl border border-line bg-white px-3" /></label>
    <button disabled={pending || !riders.length} className="h-11 rounded-full bg-night px-4 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Creating…" : "Create settlement"}</button>
    {state.message && <p role={state.status === "error" ? "alert" : "status"} className={`w-full text-sm ${state.status === "error" ? "text-red-700" : "text-emerald-800"}`}>{state.message}</p>}
  </form>;
}

export function MarkSettlementPaidForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(markSettlementPaid, initial);
  return <form action={action} className="flex items-center gap-2"><input type="hidden" name="id" value={id} /><button disabled={pending} className="h-9 rounded-full bg-emerald-700 px-3 text-xs font-semibold text-white disabled:opacity-50">{pending ? "Saving…" : "Mark paid"}</button>{state.message && <span role={state.status === "error" ? "alert" : "status"} className="text-xs text-muted">{state.message}</span>}</form>;
}
