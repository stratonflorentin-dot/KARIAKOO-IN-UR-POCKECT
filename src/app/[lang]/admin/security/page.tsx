import type { Metadata } from "next";
import { Activity, Clock, Database, User } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card, PageHeader, StatCard } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/States";
import { requireRole } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Audit log" };

type AuditRow = {
  id: number;
  actor_id: string | null;
  action: string;
  entity: string;
  entity_id: string;
  reason: string | null;
  data: Record<string, unknown>;
  created_at: string;
};

/** Map known action names to tone colours. */
function actionTone(action: string): "danger" | "warning" | "success" | "neutral" {
  if (action.includes("delete") || action.includes("reject") || action.includes("cancel")) return "danger";
  if (action.includes("update") || action.includes("change") || action.includes("adjust")) return "warning";
  if (action.includes("create") || action.includes("approve") || action.includes("settle")) return "success";
  return "neutral";
}

export default async function AdminSecurityPage() {
  await requireRole("admin");
  const sb = await createSupabaseServerClient();
  const { data, error } = await sb
    .from("audit_logs")
    .select("id,actor_id,action,entity,entity_id,reason,data,created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(`Could not load audit history: ${error.message}`);
  const rows = (data ?? []) as unknown as AuditRow[];

  // Unique actors, entities, last 24 h count
  const actors = new Set(rows.map((r) => r.actor_id ?? "system")).size;
  const entities = new Set(rows.map((r) => r.entity)).size;
  // Derive cutoff from the newest entry to avoid calling Date.now() during render.
  const newest = rows[0]?.created_at ?? new Date(0).toISOString();
  const newestMs = new Date(newest).getTime();
  const cutoff = new Date(newestMs - 24 * 60 * 60 * 1000).toISOString();
  const last24h = rows.filter((r) => r.created_at > cutoff).length;

  return (
    <>
      <PageHeader
        title="Security & audit log"
        description="Recent privileged changes recorded by database functions. Logs are immutable and read-only."
      />

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total logged" value={String(rows.length)} icon={<Activity size={18} />} hint="Last 200 entries" />
        <StatCard label="Last 24 h" value={String(last24h)} icon={<Clock size={18} />} hint="Recent activity" />
        <StatCard label="Unique actors" value={String(actors)} icon={<User size={18} />} hint="Users + system" />
        <StatCard label="Entity types" value={String(entities)} icon={<Database size={18} />} hint="Tables affected" />
      </div>

      <div className="mt-6">
        {rows.length === 0 ? (
          <EmptyState title="No privileged actions logged yet" body="Moderation and other admin RPC actions will appear here." />
        ) : (
          <ul className="space-y-2">
            {rows.map((r) => (
              <li key={r.id}>
                <Card className="flex flex-wrap items-start gap-4 p-4 text-sm">
                  {/* Time + action */}
                  <div className="w-36 shrink-0">
                    <time className="text-xs text-muted">{formatDateTime(r.created_at)}</time>
                    <div className="mt-1">
                      <Badge tone={actionTone(r.action)} className="capitalize">{r.action.replace(/_/g, " ")}</Badge>
                    </div>
                  </div>

                  {/* Entity */}
                  <div className="w-48 shrink-0">
                    <p className="font-semibold capitalize">{r.entity.replace(/_/g, " ")}</p>
                    <p className="font-mono text-xs text-muted">{r.entity_id.slice(0, 16)}{r.entity_id.length > 16 ? "…" : ""}</p>
                  </div>

                  {/* Actor */}
                  <div className="w-40 shrink-0">
                    <p className="text-xs text-muted">Actor</p>
                    <p className="font-mono text-xs">{r.actor_id ? r.actor_id.slice(0, 16) + "…" : "System"}</p>
                  </div>

                  {/* Reason / data */}
                  <div className="min-w-0 flex-1">
                    {r.reason ? (
                      <p className="text-ink">{r.reason}</p>
                    ) : (
                      <pre className="overflow-x-auto rounded-lg bg-subtle px-3 py-2 text-xs text-muted">
                        {JSON.stringify(r.data, null, 2)}
                      </pre>
                    )}
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
