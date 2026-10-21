import type { Metadata } from "next";
import { StockBadge } from "@/components/product/StockBadge";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/Card";
import { compactInputClass } from "@/components/ui/Field";
import { buttonClasses } from "@/components/ui/Button";
import { TableCard, THead, Th, tbodyClass, tdClass } from "@/components/ui/Table";
import { requireRole } from "@/lib/auth/session";
import { getCategory } from "@/lib/catalog";
import { resolveCommissionBps } from "@/lib/commission";
import { liveAdminCommissionRules } from "@/lib/data/admin-live";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatTzs } from "@/lib/format";
import { formatBps } from "@/lib/money";
import { nowIso } from "@/lib/time";

export const metadata: Metadata = { title: "Products" };

export default async function AdminProductsPage({ searchParams }: PageProps<"/[lang]/admin/products">) {
  const session = await requireRole("admin");
  const sb = await createSupabaseServerClient();
  const [productsResult, shopsResult, rules] = await Promise.all([
    sb.from("products").select("id,name,category,price_tzs,stock,status,shop_id").eq("is_demo", false),
    sb.from("shops").select("id,name,status,area"),
    liveAdminCommissionRules(session),
  ]);
  if (productsResult.error || shopsResult.error) throw new Error(`Could not load marketplace listings: ${productsResult.error?.message ?? shopsResult.error?.message}`);
  const products = (productsResult.data ?? []) as { id: string; name: string; category: string; price_tzs: number; stock: number; status: string; shop_id: string }[];
  const shops = (shopsResult.data ?? []) as { id: string; name: string; status: string; area: string }[];
  const raw = (await searchParams).q;
  const q = (typeof raw === "string" ? raw : "").trim().toLowerCase().slice(0, 80);
  const now = await nowIso();
  const rows = products.filter((p) => !q || `${p.name} ${shops.find((s) => s.id === p.shop_id)?.name}`.toLowerCase().includes(q));

  return (
    <>
      <PageHeader title="Products" description={`${products.length} live database listings across all shops, including hidden listings.`} />
      <form action="/admin/products" className="mb-4 flex gap-2">
        <label htmlFor="p-q" className="sr-only">Search products</label>
        <input id="p-q" name="q" type="search" defaultValue={q} placeholder="Search products or shops" className={compactInputClass} />
        <button type="submit" className={buttonClasses({ variant: "dark" })}>Search</button>
      </form>
      <TableCard label="All products" minWidth="56rem">
        <THead><Th>Product</Th><Th>Shop</Th><Th>Category</Th><Th align="right">Price</Th><Th align="right">Rate today</Th><Th>Stock</Th><Th>Visibility</Th></THead>
        <tbody className={tbodyClass}>
          {rows.map((p) => {
            const shop = shops.find((s) => s.id === p.shop_id);
            const visible = p.status === "active" && shop?.status === "approved";
            return (
              <tr key={p.id}>
                <th scope="row" className={`${tdClass} font-medium`}>{p.name}</th>
                <td className={tdClass}>{shop?.name}</td>
                <td className={tdClass}>{getCategory(p.category)?.name ?? p.category}</td>
                <td className={`${tdClass} text-right tabular-nums`}>{formatTzs(Number(p.price_tzs))}</td>
                <td className={`${tdClass} text-right tabular-nums`}>{formatBps(resolveCommissionBps(rules, { shopId: p.shop_id, category: p.category as never, at: now }).rateBps)}</td>
                <td className={tdClass}><StockBadge stock={p.stock} /></td>
                <td className={tdClass}>
                  {visible ? <Badge tone="success">Live</Badge> : <Badge tone="warning">{p.status === "archived" ? "Archived" : `Hidden: shop ${shop?.status ?? "unavailable"}`}</Badge>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </TableCard>
    </>
  );
}
