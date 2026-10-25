import type { Metadata } from "next";
import { AlertTriangle, CheckCircle2, Clock, MapPin, Shield } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card, PageHeader, StatCard } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/States";
import { IncidentActions } from "@/components/admin/IncidentActions";
import { requireRole } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Safety & Incidents" };

type Incident = {
  id: string;
  rider_id: string;
  order_id: string | null;
  kind: string;
  status: string;
  note: string;
  lat: number | null;
  lng: number | null;
  created_at: string;
  profiles: { full_name: string; phone: string | null } | null;
};

const KIND_TONE = { sos: "danger", accident: "danger", breakdown: "warning", dispute: "warning" } as Record<string, "danger" | "warning" | "neutral">;
const STATUS_TONE = { open: "danger", acknowledged: "warning", resolved: "success" } as Record<string, "danger" | "warning" | "success" | "neutral">;

export default async function AdminDisputesPage() {
  await requireRole("admin");
  const sb = await createSupabaseServerClient();
  const { data, error } = await sb
    .from("rider_incidents")
    .select("id,rider_id,order_id,kind,status,note,lat,lng,created_at,profiles(full_name,phone)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(`Could not load rider incidents: ${error.message}`);
  const rows = (data ?? []) as unknown as Incident[];

  const open = rows.filter((r) => r.status === "open").length;
  const acknowledged = rows.filter((r) => r.status === "acknowledged").length;
  const resolved = rows.filter((r) => r.status === "resolved").length;
  const critical = rows.filter((r) => r.kind === "sos" || r.kind === "accident").length;

  return (
    <>
      <PageHeader
        title="Safety & incident queue"
        description="Acknowledge rider SOS and other incidents, preserve the record, and resolve them after follow-up."
      />

      {/* Metrics bar */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Open incidents"
          value={String(open)}
          icon={<AlertTriangle size={18} />}
          hint="Require immediate attention"
        />
        <StatCard
          label="Acknowledged"
          value={String(acknowledged)}
          icon={<Clock size={18} />}
          hint="In follow-up"
        />
        <StatCard
          label="Resolved"
          value={String(resolved)}
          icon={<CheckCircle2 size={18} />}
          hint="Closed incidents"
        />
        <StatCard
          label="Critical (SOS/Accident)"
          value={String(critical)}
          icon={<Shield size={18} />}
          hint="High-priority kinds"
        />
      </div>

      <div className="mt-6">
        {rows.length === 0 ? (
          <EmptyState title="No incidents reported" body="Rider safety reports will be queued here." />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((r) => (
              <li key={r.id}>
                <Card className="flex h-full flex-col gap-3 p-4">
                  {/* Header row */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={KIND_TONE[r.kind] ?? "neutral"} className="capitalize">{r.kind}</Badge>
                      <Badge tone={STATUS_TONE[r.status] ?? "neutral"} className="capitalize">{r.status}</Badge>
                    </div>
                    <time className="text-xs text-muted">{formatDateTime(r.created_at)}</time>
                  </div>

                  {/* Rider info */}
                  <div>
                    <p className="font-semibold">{r.profiles?.full_name ?? "Rider"}</p>
                    <p className="text-xs text-muted">{r.profiles?.phone ?? "No phone on record"}</p>
                  </div>

                  {/* Note */}
                  {r.note && (
                    <p className="rounded-xl bg-subtle px-3 py-2 text-sm text-ink">{r.note}</p>
                  )}

                  {/* Order + location */}
                  <div className="flex flex-wrap gap-3 text-xs text-muted">
                    {r.order_id && (
                      <span>Order: <span className="font-mono">{r.order_id.slice(0, 8)}</span></span>
                    )}
                    {r.lat != null && r.lng != null && (
                      <a
                        href={`https://www.openstreetmap.org/?mlat=${r.lat}&mlon=${r.lng}#map=16/${r.lat}/${r.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-brand-700 underline"
                      >
                        <MapPin size={12} aria-hidden="true" /> View location
                      </a>
                    )}
                  </div>

                  {/* Actions — pushed to bottom */}
                  <div className="mt-auto pt-1">
                    <IncidentActions id={r.id} status={r.status} />
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
