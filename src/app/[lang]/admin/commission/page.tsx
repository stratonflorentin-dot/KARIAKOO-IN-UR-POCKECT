import type { Metadata } from "next";
import { Badge } from "@/components/ui/Badge";
import { Card, PageHeader, StatCard } from "@/components/ui/Card";
import { Notice } from "@/components/ui/States";
import { TableCard, THead, Th, tbodyClass, tdClass } from "@/components/ui/Table";
import { requireRole } from "@/lib/auth/session";
import { getCategory } from "@/lib/catalog";
import { liveAdminCommissionRules } from "@/lib/data/admin-live";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { formatBps } from "@/lib/money";
import { nowMs } from "@/lib/time";

export const metadata: Metadata = { title: "Commission" };

export default async function AdminCommissionPage() {
  const session = await requireRole("admin");
  const sb = await createSupabaseServerClient();
  const [rules, shopsResult] = await Promise.all([
    liveAdminCommissionRules(session),
    sb.from("shops").select("id,name"),
  ]);
  if (shopsResult.error) throw new Error(`Could not load shops: ${shopsResult.error.message}`);
  const shops = (shopsResult.data ?? []) as { id: string; name: string }[];
  const now = await nowMs();
  const currentDefault = rules.find((r) => r.scope === "default" && Date.parse(r.effectiveFrom) <= now);
  const target = (scope: string, t?: string) =>
    scope === "default" ? "All shops & categories" : scope === "shop" ? shops.find((s) => s.id === t)?.name ?? t : getCategory(t ?? "")?.name ?? t;

  return (
    <>
      <PageHeader title="Commission settings" description="Commission is a percentage of the merchandise subtotal, excluding delivery. Rules are never edited in place: a new rate is a new rule with a future effective date." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Current default rate" value={currentDefault ? formatBps(currentDefault.rateBps) : "Not configured"} hint={currentDefault ? `Since ${formatDate(currentDefault.effectiveFrom)}` : undefined} />
        <StatCard label="Special rules" value={String(rules.filter((r) => r.scope !== "default").length)} hint="Shop or category rates" />
        <StatCard label="Precedence" value="Shop → Category → Default" />
      </div>

      <div className="mt-6">
        <TableCard label="Commission rule history" minWidth="48rem">
          <THead><Th>Applies to</Th><Th align="right">Rate</Th><Th>Effective from</Th><Th>Status</Th><Th>Note</Th></THead>
          <tbody className={tbodyClass}>
            {rules.map((r) => {
              const effective = Date.parse(r.effectiveFrom) <= now;
              const superseded = r.scope === "default" && effective && r.id !== currentDefault?.id;
              return (
                <tr key={r.id}>
                  <th scope="row" className={`${tdClass} font-medium`}>{target(r.scope, r.target)}<span className="block text-xs font-normal capitalize text-muted">{r.scope} rule</span></th>
                  <td className={`${tdClass} text-right font-semibold tabular-nums`}>{formatBps(r.rateBps)}</td>
                  <td className={tdClass}>{formatDate(r.effectiveFrom)}</td>
                  <td className={tdClass}>{!effective ? <Badge tone="info">Scheduled</Badge> : superseded ? <Badge>Historical</Badge> : <Badge tone="success">In force</Badge>}</td>
                  <td className={tdClass}>{r.note}<span className="block text-xs text-muted">by {r.createdBy}</span></td>
                </tr>
              );
            })}
          </tbody>
        </TableCard>
      </div>

      <Card className="mt-6" aria-labelledby="rules-explained">
        <h2 id="rules-explained" className="font-semibold">How rates apply</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
          <li>Each order item stores the rate in force when the order was placed. Later changes never alter past orders.</li>
          <li>Example: a 2025 order placed under the 12% launch rate keeps 12% even though the default is now 10%.</li>
          <li>All rates are validated and applied on the server, never accepted from the browser.</li>
        </ul>
      </Card>
      {!rules.length && <div className="mt-4"><Notice tone="warning">No commission rules have been configured in the live database.</Notice></div>}
    </>
  );
}
