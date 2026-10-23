"use client";

import { useActionState } from "react";
import { updateAdminIncident, type AdminActionResult } from "@/app/[lang]/admin/actions";

export function IncidentActions({ id, status }: { id: string; status: string }) {
  const [state, action, pending] = useActionState(updateAdminIncident, { status: "idle" } satisfies AdminActionResult);
  const next = status === "open" ? "acknowledged" : status === "acknowledged" ? "resolved" : null;
  if (!next) return <span className="text-sm text-muted">Resolved</span>;
  return <form action={action} className="flex flex-wrap items-center gap-2"><input type="hidden" name="id" value={id} /><input type="hidden" name="status" value={next} /><button disabled={pending} className="h-9 rounded-full bg-night px-3 text-xs font-semibold text-white disabled:opacity-50">{pending ? "Saving…" : next === "acknowledged" ? "Acknowledge" : "Resolve"}</button>{state.message && <span role={state.status === "error" ? "alert" : "status"} className={`text-xs ${state.status === "error" ? "text-red-700" : "text-emerald-800"}`}>{state.message}</span>}</form>;
}
