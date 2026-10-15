"use client";

// Demo product manager. Edits live only in this browser tab and are never
// sent anywhere. In Phase 3 each change becomes a Server Action that checks
// the signed-in seller owns the product and validates it with Zod, with Row
// Level Security as a second line of defence.
import { ChevronDown, Eye } from "lucide-react";
import Link from "next/link";
import { Fragment, useState } from "react";
import { ProductImage } from "@/components/product/ProductImage";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { compactInputClass } from "@/components/ui/Field";
import { TableCard, THead, Th, tbodyClass, tdClass } from "@/components/ui/Table";
import { audienceLabel, productTypeLabel } from "@/lib/departments";
import { formatTzs } from "@/lib/format";
import type { Category, Product } from "@/lib/types";
import { ProductComposer, type PublishedDraft } from "./ProductComposer";

type Row = Pick<Product, "id" | "slug" | "name" | "category" | "priceTzs" | "stock" | "status" | "description" | "audience" | "productType" | "imageUrl">;

export function SellerProductsManager({ initialProducts, categories, shopName }: { initialProducts: Row[]; categories: Category[]; shopName: string }) {
  const [rows, setRows] = useState<Row[]>(initialProducts);
  const [message, setMessage] = useState("");
  const [nextId, setNextId] = useState(1);
  const [open, setOpen] = useState<string | null>(null);

  const update = (id: string, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const publish = (d: PublishedDraft) => {
    const id = `local-${nextId}`;
    setRows((rs) => [{ id, slug: "", status: "active", ...d }, ...rs]);
    setNextId((n) => n + 1);
    setOpen(id);
    setMessage(`Published “${d.name}” in this preview (not saved). Customers would see the photo and description shown below.`);
  };

  return (
    <>
      <ProductComposer categories={categories} shopName={shopName} onPublish={publish} />
      <p role="status" aria-live="polite" className="mt-3 min-h-5 text-sm text-emerald-800">{message}</p>

      <div className="mt-3">
        <TableCard label="Your products" minWidth="52rem">
          <THead><Th>Product</Th><Th>Price (TSh)</Th><Th>Stock</Th><Th>Status</Th><Th><span className="sr-only">Actions</span></Th></THead>
          <tbody className={tbodyClass}>
            {rows.map((r) => (
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
                    <label className="sr-only" htmlFor={`price-${r.id}`}>Price of {r.name}</label>
                    <input id={`price-${r.id}`} type="number" min={100} step={100} value={r.priceTzs} disabled={r.status === "archived"}
                      onChange={(e) => update(r.id, { priceTzs: Math.max(0, Math.round(Number(e.target.value) || 0)) })}
                      className={`${compactInputClass} w-32`} />
                  </td>
                  <td className={tdClass}>
                    <label className="sr-only" htmlFor={`stock-${r.id}`}>Stock of {r.name}</label>
                    <input id={`stock-${r.id}`} type="number" min={0} step={1} value={r.stock} disabled={r.status === "archived"}
                      onChange={(e) => update(r.id, { stock: Math.max(0, Math.round(Number(e.target.value) || 0)) })}
                      className={`${compactInputClass} w-24 ${r.stock === 0 ? "border-red-300" : ""}`} />
                  </td>
                  <td className={tdClass}>
                    {r.status === "archived" ? <Badge>Archived</Badge> : r.stock === 0 ? <Badge tone="danger">Out of stock</Badge> : r.stock <= 5 ? <Badge tone="warning">Low stock</Badge> : <Badge tone="success">Live</Badge>}
                  </td>
                  <td className={`${tdClass} whitespace-nowrap text-right`}>
                    <button type="button" onClick={() => setOpen(open === r.id ? null : r.id)} aria-expanded={open === r.id}
                      className="mr-1 inline-flex h-10 items-center gap-1 rounded-lg px-3 text-sm text-ink hover:bg-subtle">
                      <ChevronDown size={15} className={open === r.id ? "rotate-180" : ""} aria-hidden="true" /> Details<span className="sr-only"> of {r.name}</span>
                    </button>
                    {r.slug && r.status === "active" && (
                      <Link href={`/customer/product/${r.slug}`} className="mr-1 inline-flex h-10 items-center gap-1 rounded-lg px-3 text-sm text-ink hover:bg-subtle">
                        <Eye size={15} aria-hidden="true" /> View<span className="sr-only"> {r.name} in store</span>
                      </Link>
                    )}
                    {r.status === "active" ? (
                      <ConfirmDialog
                        title={`Archive “${r.name}”?`}
                        body="Archived products are hidden from customers. Past orders keep their records. You can restore it later."
                        confirmLabel="Archive"
                        onConfirm={() => { update(r.id, { status: "archived" }); setMessage(`Archived “${r.name}” in this preview (not saved).`); }}
                        trigger={(openDialog) => <button type="button" onClick={openDialog} className="h-10 rounded-lg px-3 text-sm text-red-700 hover:bg-red-50">Archive<span className="sr-only"> {r.name}</span></button>}
                      />
                    ) : (
                      <button type="button" onClick={() => { update(r.id, { status: "active" }); setMessage(`Restored “${r.name}” in this preview (not saved).`); }} className="h-10 rounded-lg px-3 text-sm text-ink hover:bg-subtle">
                        Restore<span className="sr-only"> {r.name}</span>
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
      </div>
    </>
  );
}
