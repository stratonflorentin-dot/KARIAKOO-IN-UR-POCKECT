import type { Metadata } from "next";
import { Card, PageHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/States";
import { requireRole } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Customers" };

export default async function AdminCustomersPage() {
  await requireRole("admin");
  const sb = await createSupabaseServerClient();
  const { data, error } = await sb.from("user_roles").select("user_id").eq("role", "customer");
  if (error) throw new Error(`Could not load customers: ${error.message}`);
  const ids = [...new Set((data ?? []).map((r) => String((r as { user_id: string }).user_id)))];
  if (ids.length === 0) return <><PageHeader title="Customers" description="Registered customer accounts in KARIAKOO." /><EmptyState title="No customer accounts yet" body="Registered customers will appear here." /></>;

  const { data: profiles, error: profileError } = await sb.from("profiles").select("id,full_name,phone,created_at").in("id", ids);
  if (profileError) throw new Error(`Could not load customer profiles: ${profileError.message}`);
  const customers = (profiles ?? []) as { id: string; full_name: string; phone: string | null; created_at: string }[];
  return <>
    <PageHeader title="Customers" description="Registered customer accounts in KARIAKOO." />
    <Card><ul className="divide-y divide-line">{customers.map((c) => <li key={c.id} className="py-3"><p className="font-medium">{c.full_name || "Customer"}</p><p className="text-sm text-muted">{c.phone || "No phone number"} · Joined {new Date(c.created_at).toLocaleDateString("en-TZ")}</p></li>)}</ul></Card>
  </>;
}
