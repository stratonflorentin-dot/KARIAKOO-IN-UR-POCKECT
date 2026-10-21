"use client";

// The seller's product manager, wired to the live products table. Publishing,
// price/stock edits and archive/restore each call a server action that writes
// under RLS (owner-scoped); the UI updates optimistically and reverts on error.
// Photos are not uploaded yet — that's the next step — so new products publish
// without a photo (a placeholder is shown).
import { ChevronDown, Eye } from "lucide-react";
import Link from "@/components/i18n/Link";
import { Fragment, useState } from "react";
import { createProduct, saveProductFields, setProductStatus } from "@/app/[lang]/seller/products/actions";
import { ProductImage } from "@/components/product/ProductImage";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { compactInputClass } from "@/components/ui/Field";
import { TableCard, THead, Th, tbodyClass, tdClass } from "@/components/ui/Table";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n/config";
import { audienceLabel, productTypeLabel } from "@/lib/departments";
import { formatTzs } from "@/lib/format";
import type { Category, Product } from "@/lib/types";
import { ProductComposer, type PublishResult, type PublishedDraft } from "./ProductComposer";

type Row = Pick<Product, "id" | "slug" | "name" | "category" | "priceTzs" | "stock" | "status" | "description" | "audience" | "productType" | "imageUrl">;

type Tab = "all" | "active" | "low" | "out" | "archived";

const TABS: { id: Tab; labelKey: "tabAll" | "tabActive" | "tabLow" | "tabOut" | "tabArchived" }[] = [
  { id: "all", labelKey: "tabAll" },
  { id: "active", labelKey: "tabActive" },
  { id: "low", labelKey: "tabLow" },
  { id: "out", labelKey: "tabOut" },
  { id: "archived", labelKey: "tabArchived" },
];

/** Which status group a product falls into, for the tabs. */
function groupOf(r: Row): Exclude<Tab, "all"> {
  if (r.status === "archived") return "archived";
  if (r.stock === 0) return "out";
  if (r.stock <= 5) return "low";
  return "active";
}

export function SellerProductsManager({ initialProducts, categories, shopName }: { initialProducts: Row[]; categories: Category[]; shopName: string }) {
  const { t } = useI18n();
  const sp = t.sellerProducts;
  const [rows, setRows] = useState<Row[]>(initialProducts);
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("all");

  const counts = { all: rows.length } as Record<Tab, number>;
  for (const t of ["active", "low", "out", "archived"] as const) counts[t] = 0;
  for (const r of rows) counts[groupOf(r)] += 1;
  const visible = tab === "all" ? rows : rows.filter((r) => groupOf(r) === tab);

  const update = (id: string, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  async function publish(d: PublishedDraft): Promise<PublishResult> {
    const fd = new FormData();
    fd.set("name", d.name);
    fd.set("category", d.category);
    if (d.audience) fd.set("audience", d.audience);
    if (d.productType) fd.set("productType", d.productType);
    fd.set("priceTzs", String(d.priceTzs));
    fd.set("stock", String(d.stock));
    fd.set("description", d.description);
    const res = await createProduct(fd);
    if (res.ok && res.id) {
      setRows((rs) => [{ id: res.id!, slug: res.slug ?? "", status: "active", name: d.name, category: d.category, priceTzs: d.priceTzs, stock: d.stock, description: d.description, audience: d.audience, productType: d.productType, imageUrl: undefined }, ...rs]);
      setMessage(fmt(sp.savedProduct, { name: d.name }));
      return { ok: true };
    }
    return { ok: false, error: res.error ?? sp.couldNotSave };
  }

  async function persistFields(r: Row) {
    const fd = new FormData();
    fd.set("id", r.id);
    fd.set("priceTzs", String(r.priceTzs));
    fd.set("stock", String(r.stock));
    const res = await saveProductFields(fd);
    setMessage(res.ok ? fmt(sp.savedPriceStock, { name: r.name }) : fmt(sp.couldNotSaveNamed, { name: r.name, error: res.error ?? "" }));
  }

  async function changeStatus(r: Row, status: Row["status"]) {
    const previous = r.status;
    update(r.id, { status }); // optimistic
    const fd = new FormData();
    fd.set("id", r.id);
    fd.set("status", status);
    const res = await setProductStatus(fd);
    if (!res.ok) {
      update(r.id, { status: previous });
      setMessage(fmt(sp.couldNotUpdate, { name: r.name, error: res.error ?? "" }));
    } else {
      setMessage(fmt(status === "archived" ? sp.archivedNamed : sp.restoredNamed, { name: r.name }));
    }
  }

  return (
    <>
      <ProductComposer categories={categories} shopName={shopName} onPublish={publish} />
      <p role="status" aria-live="polite" className="mt-3 min-h-5 text-sm text-emerald-800">{message}</p>

      <div role="tablist" aria-label={sp.filterLabel} className="no-scrollbar mt-4 flex gap-2 overflow-x-auto">
        {TABS.map((tabDef) => (
          <button
            key={tabDef.id}
            type="button"
            role="tab"
            aria-selected={tab === tabDef.id}
            onClick={() => setTab(tabDef.id)}
            className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition ${
              tab === tabDef.id ? "bg-brand-600 text-white" : "border border-line bg-white text-ink hover:border-brand-300"
            }`}
          >
            {sp[tabDef.labelKey]}
            <span className={`rounded-full px-1.5 text-xs tabular-nums ${tab === tabDef.id ? "bg-white/20" : "bg-subtle text-muted"}`}>{counts[tabDef.id]}</span>
          </button>
        ))}
      </div>

      <div className="mt-3">
        {visible.length === 0 ? (
          <p className="rounded-2xl border border-line bg-white p-6 text-center text-sm text-muted">
            {rows.length === 0 ? sp.noProductsYet : sp.noneInList}
          </p>
        ) : (
        <TableCard label={sp.tableLabel} minWidth="52rem">
          <THead><Th>{sp.colProduct}</Th><Th>{sp.colPrice}</Th><Th>{sp.colStock}</Th><Th>{sp.colStatus}</Th><Th><span className="sr-only">{sp.colActions}</span></Th></THead>
          <tbody className={tbodyClass}>
            {visible.map((r) => (
              <Fragment key={r.id}>
                <tr className={r.status === "archived" ? "bg-subtle text-muted" : ""}>
                  <th scope="row" className={`${tdClass} font-medium`}>
                    <div className="flex items-center gap-3">
                      <div className="w-12 shrink-0 overflow-hidden rounded-lg"><ProductImage category={r.category} name={r.name} imageUrl={r.imageUrl} size="sm" /></div>
                      <div className="min-w-0">
                        <span className="block truncate">{r.name}</span>
                        <span className="block text-xs font-normal text-muted">
                          {formatTzs(r.priceTzs)}
                          {r.audience && ` · ${audienceLabel(r.audience)}`}
                          {r.productType && ` · ${productTypeLabel(r.productType)}`}
                        </span>
                      </div>
                    </div>
                  </th>
                  <td className={tdClass}>
                    <label className="sr-only" htmlFor={`price-${r.id}`}>{fmt(sp.priceOf, { name: r.name })}</label>
                    <input id={`price-${r.id}`} type="number" min={100} step={100} value={r.priceTzs} disabled={r.status === "archived"}
                      onChange={(e) => update(r.id, { priceTzs: Math.max(0, Math.round(Number(e.target.value) || 0)) })}
                      onBlur={() => persistFields(r)}
                      className={`${compactInputClass} w-32`} />
                  </td>
                  <td className={tdClass}>
                    <label className="sr-only" htmlFor={`stock-${r.id}`}>{fmt(sp.stockOf, { name: r.name })}</label>
                    <input id={`stock-${r.id}`} type="number" min={0} step={1} value={r.stock} disabled={r.status === "archived"}
                      onChange={(e) => update(r.id, { stock: Math.max(0, Math.round(Number(e.target.value) || 0)) })}
                      onBlur={() => persistFields(r)}
                      className={`${compactInputClass} w-24 ${r.stock === 0 ? "border-red-300" : ""}`} />
                  </td>
                  <td className={tdClass}>
                    {r.status === "archived" ? <Badge>{sp.archived}</Badge> : r.stock === 0 ? <Badge tone="danger">{sp.outOfStock}</Badge> : r.stock <= 5 ? <Badge tone="warning">{sp.lowStock}</Badge> : <Badge tone="success">{sp.live}</Badge>}
                  </td>
                  <td className={`${tdClass} whitespace-nowrap text-right`}>
                    <button type="button" onClick={() => setOpen(open === r.id ? null : r.id)} aria-expanded={open === r.id}
                      className="mr-1 inline-flex h-10 items-center gap-1 rounded-lg px-3 text-sm text-ink hover:bg-subtle">
                      <ChevronDown size={15} className={open === r.id ? "rotate-180" : ""} aria-hidden="true" /> {sp.details}<span className="sr-only"> {r.name}</span>
                    </button>
                    {r.slug && r.status === "active" && (
                      <Link href={`/customer/product/${r.slug}`} className="mr-1 inline-flex h-10 items-center gap-1 rounded-lg px-3 text-sm text-ink hover:bg-subtle">
                        <Eye size={15} aria-hidden="true" /> {sp.view}<span className="sr-only"> {r.name}</span>
                      </Link>
                    )}
                    {r.status === "active" ? (
                      <ConfirmDialog
                        title={fmt(sp.archiveTitle, { name: r.name })}
                        body={sp.archiveBody}
                        confirmLabel={sp.archive}
                        onConfirm={() => changeStatus(r, "archived")}
                        trigger={(openDialog) => <button type="button" onClick={openDialog} className="h-10 rounded-lg px-3 text-sm text-red-700 hover:bg-red-50">{sp.archive}<span className="sr-only"> {r.name}</span></button>}
                      />
                    ) : (
                      <button type="button" onClick={() => changeStatus(r, "active")} className="h-10 rounded-lg px-3 text-sm text-ink hover:bg-subtle">
                        {sp.restore}<span className="sr-only"> {r.name}</span>
                      </button>
                    )}
                  </td>
                </tr>
                {open === r.id && (
                  <tr className="bg-subtle">
                    <td colSpan={5} className="px-4 py-4">
                      <div className="flex flex-col gap-4 sm:flex-row">
                        <div className="w-40 shrink-0 overflow-hidden rounded-xl"><ProductImage category={r.category} name={r.name} imageUrl={r.imageUrl} /></div>
                        <div className="min-w-0">
                          <p className="font-semibold">{r.name}</p>
                          <p className="mt-1 whitespace-pre-line text-sm text-muted">{r.description}</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </TableCard>
        )}
      </div>
    </>
  );
}
