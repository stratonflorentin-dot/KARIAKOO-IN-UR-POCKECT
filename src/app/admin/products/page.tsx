import type { Metadata } from "next";
import { StockBadge } from "@/components/product/StockBadge";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/Card";
import { compactInputClass } from "@/components/ui/Field";
import { buttonClasses } from "@/components/ui/Button";
import { TableCard, THead, Th, tbodyClass, tdClass } from "@/components/ui/Table";
import { demoCommissionRules } from "@/data/demo/commission-rules";
import { requireRole } from "@/lib/auth/session";
import { getCategory } from "@/lib/catalog";
import { resolveCommissionBps } from "@/lib/commission";
import { adminData } from "@/lib/data/access";
import { formatTzs } from "@/lib/format";
import { formatBps } from "@/lib/money";
import { nowIso } from "@/lib/time";

export const metadata: Metadata = { title: "Products" };

export default async function AdminProductsPage({ searchParams }: PageProps<"/admin/products">) {
  const { products, shops } = adminData(await requireRole("admin"));
  const raw = (await searchParams).q;
  const q = (typeof raw === "string" ? raw : "").trim().toLowerCase().slice(0, 80);
  const now = await nowIso();
  const rows = products.filter((p) => !q || `${p.name} ${shops.find((s) => s.id === p.shopId)?.name}`.toLowerCase().includes(q));

  return (
    <>
      <PageHeader title="Products" description={`${products.length} listings across all shops, including hidden ones. Moderation (approve, remove, reports) arrives with an audit trail in Phase 5.`} />
      <form action="/admin/products" className="mb-4 flex gap-2">
        <label htmlFor="p-q" className="sr-only">Search products</label>
        <input id="p-q" name="q" type="search" defaultValue={q} placeholder="Search products or shops" className={compactInputClass} />
        <button type="submit" className={buttonClasses({ variant: "dark" })}>Search</button>
      </form>
      <TableCard label="All products" minWidth="56rem">
        <THead><Th>Product</Th><Th>Shop</Th><Th>Category</Th><Th align="right">Price</Th><Th align="right">Rate today</Th><Th>Stock</Th><Th>Visibility</Th></THead>
        <tbody className={tbodyClass}>
          {rows.map((p) => {
            const shop = shops.find((s) => s.id === p.shopId);
            const visible = p.status === "active" && shop?.status === "approved";
            return (
              <tr key={p.id}>
                <th scope="row" className={`${tdClass} font-medium`}>{p.name}</th>
                <td className={tdClass}>{shop?.name}</td>
                <td className={tdClass}>{getCategory(p.category)?.name}</td>
                <td className={`${tdClass} text-right tabular-nums`}>{formatTzs(p.priceTzs)}</td>
                <td className={`${tdClass} text-right tabular-nums`}>{formatBps(resolveCommissionBps(demoCommissionRules, { shopId: p.shopId, category: p.category, at: now }).rateBps)}</td>
                <td className={tdClass}><StockBadge stock={p.stock} /></td>
                <td className={tdClass}>
                  {visible ? <Badge tone="success">Live</Badge> : <Badge tone="warning">{p.status === "archived" ? "Archived" : `Hidden: shop ${shop?.status}`}</Badge>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </TableCard>
    </>
  );
}
