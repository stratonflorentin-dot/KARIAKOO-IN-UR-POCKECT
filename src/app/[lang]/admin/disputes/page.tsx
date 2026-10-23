import type { Metadata } from "next";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/States";
import { TableCard, THead, Th, tbodyClass, tdClass } from "@/components/ui/Table";
import { IncidentActions } from "@/components/admin/IncidentActions";
import { requireRole } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Incidents" };
export default async function AdminDisputesPage() {
  await requireRole("admin");
  const sb = await createSupabaseServerClient();
  const { data, error } = await sb.from("rider_incidents").select("id,rider_id,order_id,kind,status,note,lat,lng,created_at,profiles(full_name,phone)").order("created_at", { ascending: false }).limit(200);
  if (error) throw new Error(`Could not load rider incidents: ${error.message}`);
  const rows = (data ?? []) as unknown as { id: string; rider_id: string; order_id: string | null; kind: string; status: string; note: string; lat: number | null; lng: number | null; created_at: string; profiles: { full_name: string; phone: string | null } | null }[];
  return <><PageHeader title="Safety & incident queue" description="Acknowledge rider SOS and other incidents, preserve the record, and resolve them after follow-up." />{rows.length ? <TableCard label="Rider incidents" minWidth="64rem"><THead><Th>Reported</Th><Th>Rider</Th><Th>Incident</Th><Th>Order / location</Th><Th>Note</Th><Th>Status & action</Th></THead><tbody className={tbodyClass}>{rows.map((r) => <tr key={r.id}><td className={tdClass}>{formatDateTime(r.created_at)}</td><th scope="row" className={tdClass}>{r.profiles?.full_name || "Rider"}<span className="block text-xs font-normal text-muted">{r.profiles?.phone || "No phone"}</span></th><td className={`${tdClass} capitalize`}><Badge tone={r.kind === "sos" || r.kind === "accident" ? "danger" : "warning"}>{r.kind}</Badge></td><td className={tdClass}>{r.order_id ? <span className="block font-mono text-xs">{r.order_id.slice(0, 8)}</span> : "—"}{r.lat != null && r.lng != null && <a className="mt-1 block text-xs text-brand-700 underline" target="_blank" rel="noreferrer" href={`https://www.openstreetmap.org/?mlat=${r.lat}&mlon=${r.lng}#map=16/${r.lat}/${r.lng}`}>View reported location</a>}</td><td className={`${tdClass} max-w-xs whitespace-normal`}>{r.note || "No details provided"}</td><td className={tdClass}><IncidentActions id={r.id} status={r.status} /></td></tr>)}</tbody></TableCard> : <EmptyState title="No incidents reported" body="Rider safety reports will be queued here." />}</>;
}
