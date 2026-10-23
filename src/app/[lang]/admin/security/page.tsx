import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/States";
import { TableCard, THead, Th, tbodyClass, tdClass } from "@/components/ui/Table";
import { requireRole } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Audit log" };
export default async function AdminSecurityPage() {
  await requireRole("admin");
  const sb = await createSupabaseServerClient();
  const { data, error } = await sb.from("audit_logs").select("id,actor_id,action,entity,entity_id,reason,data,created_at").order("created_at", { ascending: false }).limit(200);
  if (error) throw new Error(`Could not load audit history: ${error.message}`);
  const rows = (data ?? []) as unknown as { id: number; actor_id: string | null; action: string; entity: string; entity_id: string; reason: string | null; data: Record<string, unknown>; created_at: string }[];
  return <><PageHeader title="Security & audit log" description="Recent privileged changes recorded by database functions. Logs are immutable; this screen is read-only." />{rows.length ? <TableCard label="Security audit history" minWidth="60rem"><THead><Th>Time</Th><Th>Actor ID</Th><Th>Action</Th><Th>Entity</Th><Th>Reason / data</Th></THead><tbody className={tbodyClass}>{rows.map((r)=><tr key={r.id}><td className={tdClass}>{formatDateTime(r.created_at)}</td><td className={`${tdClass} font-mono text-xs`}>{r.actor_id ?? "System"}</td><td className={tdClass}>{r.action}</td><td className={tdClass}>{r.entity}<span className="block font-mono text-xs text-muted">{r.entity_id}</span></td><td className={`${tdClass} max-w-sm whitespace-normal`}>{r.reason || JSON.stringify(r.data)}</td></tr>)}</tbody></TableCard>:<EmptyState title="No privileged actions logged yet" body="Moderation and other admin RPC actions will appear here." />}</>;
}
