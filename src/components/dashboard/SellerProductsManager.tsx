"use client";

// Demo product manager. Edits live only in this browser tab and are never
// sent anywhere. In Phase 3 each change becomes a Server Action that checks
// the signed-in seller owns the product and validates price and stock with
// Zod, with Row Level Security as a second line of defence.
import { Eye } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { compactInputClass } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { TableCard, THead, Th, tbodyClass, tdClass } from "@/components/ui/Table";
import { formatTzs } from "@/lib/format";
import type { Category, Product } from "@/lib/types";

type Row = Pick<Product, "id" | "slug" | "name" | "category" | "priceTzs" | "stock" | "status">;

export function SellerProductsManager({ initialProducts, categories }: { initialProducts: Row[]; categories: Category[] }) {
  const [rows, setRows] = useState<Row[]>(initialProducts);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [nextId, setNextId] = useState(1);

  const update = (id: string, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const onAdd = (form: HTMLFormElement) => {
    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    const price = Number(data.get("price"));
    const stock = Number(data.get("stock"));
    const category = String(data.get("category")) as Row["category"];
    const errs: Record<string, string> = {};
    if (name.length < 3 || name.length > 120) errs.name = "Use 3–120 characters.";
    if (!Number.isSafeInteger(price) || price < 100 || price > 50_000_000) errs.price = "Whole shillings, TSh 100 to 50,000,000.";
    if (!Number.isSafeInteger(stock) || stock < 0 || stock > 100_000) errs.stock = "Whole number, 0 to 100,000.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setRows((rs) => [{ id: `local-${nextId}`, slug: "", name, category, priceTzs: price, stock, status: "active" }, ...rs]);
    setNextId((n) => n + 1);
    setMessage(`Added “${name}” to this preview (not saved).`);
    form.reset();
  };

  return (
    <>
      <section aria-labelledby="add-title" className="rounded-2xl border border-line bg-white p-5">
        <h2 id="add-title" className="font-semibold">Add a product</h2>
        <form
          noValidate
          className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1.2fr_1fr_1fr_auto] lg:items-start"
          onSubmit={(e) => {
            e.preventDefault();
            onAdd(e.currentTarget);
          }}
        >
          <div>
            <label htmlFor="np-name" className="text-sm font-medium">Product name</label>
            <input id="np-name" name="name" className={`${compactInputClass} mt-1`} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "np-name-err" : undefined} />
            {errors.name && <p id="np-name-err" className="mt-1 text-xs text-red-700">{errors.name}</p>}
          </div>
          <div>
            <label htmlFor="np-cat" className="text-sm font-medium">Category</label>
            <select id="np-cat" name="category" className={`${compactInputClass} mt-1`} defaultValue={categories[0]?.slug}>
              {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="np-price" className="text-sm font-medium">Price (TSh)</label>
            <input id="np-price" name="price" type="number" inputMode="numeric" min={100} step={100} className={`${compactInputClass} mt-1`} aria-invalid={Boolean(errors.price)} aria-describedby={errors.price ? "np-price-err" : undefined} />
            {errors.price && <p id="np-price-err" className="mt-1 text-xs text-red-700">{errors.price}</p>}
          </div>
          <div>
            <label htmlFor="np-stock" className="text-sm font-medium">Stock</label>
            <input id="np-stock" name="stock" type="number" inputMode="numeric" min={0} step={1} className={`${compactInputClass} mt-1`} aria-invalid={Boolean(errors.stock)} aria-describedby={errors.stock ? "np-stock-err" : undefined} />
            {errors.stock && <p id="np-stock-err" className="mt-1 text-xs text-red-700">{errors.stock}</p>}
          </div>
          <Button type="submit" className="lg:mt-6">Add</Button>
        </form>
        <p className="mt-2 text-xs text-muted">Image upload (with file type and size checks) arrives with Supabase Storage in Phase 3.</p>
        <p role="status" aria-live="polite" className="mt-1 min-h-5 text-sm text-emerald-800">{message}</p>
      </section>

      <div className="mt-6">
        <TableCard label="Your products" minWidth="48rem">
          <THead><Th>Product</Th><Th>Price (TSh)</Th><Th>Stock</Th><Th>Status</Th><Th><span className="sr-only">Actions</span></Th></THead>
          <tbody className={tbodyClass}>
            {rows.map((r) => (
              <tr key={r.id} className={r.status === "archived" ? "bg-subtle text-muted" : ""}>
                <th scope="row" className={`${tdClass} font-medium`}>
                  {r.name}
                  <span className="block text-xs font-normal text-muted">{formatTzs(r.priceTzs)}</span>
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
                  {r.slug && r.status === "active" && (
                    <Link href={`/customer/product/${r.slug}`} className="mr-1 inline-flex h-10 items-center gap-1 rounded-lg px-3 text-sm text-ink hover:bg-subtle">
                      <Eye size={15} aria-hidden="true" /> Preview<span className="sr-only"> {r.name}</span>
                    </Link>
                  )}
                  {r.status === "active" ? (
                    <ConfirmDialog
                      title={`Archive “${r.name}”?`}
                      body="Archived products are hidden from customers. Past orders keep their records. You can restore it later."
                      confirmLabel="Archive"
                      onConfirm={() => { update(r.id, { status: "archived" }); setMessage(`Archived “${r.name}” in this preview (not saved).`); }}
                      trigger={(open) => <button type="button" onClick={open} className="h-10 rounded-lg px-3 text-sm text-red-700 hover:bg-red-50">Archive<span className="sr-only"> {r.name}</span></button>}
                    />
                  ) : (
                    <button type="button" onClick={() => { update(r.id, { status: "active" }); setMessage(`Restored “${r.name}” in this preview (not saved).`); }} className="h-10 rounded-lg px-3 text-sm text-ink hover:bg-subtle">
                      Restore<span className="sr-only"> {r.name}</span>
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </TableCard>
      </div>
    </>
  );
}
