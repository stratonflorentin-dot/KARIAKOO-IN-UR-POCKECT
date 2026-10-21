"use client";

// "Add a product" form with a customer-facing preview. Product details save
// to Supabase; photo upload is explicitly unavailable until storage is wired.
import { ImagePlus, Store, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Price } from "@/components/product/Price";
import { ProductImage } from "@/components/product/ProductImage";
import { StockBadge } from "@/components/product/StockBadge";
import { Button } from "@/components/ui/Button";
import { compactInputClass } from "@/components/ui/Field";
import { useI18n } from "@/i18n/client";
import type { Dictionary } from "@/i18n/dictionaries";
import { apparelCategories, audiences, productTypes } from "@/lib/departments";
import { IMAGE_TYPES, productDraftSchema, validateImageFile } from "@/lib/validation/product";
import type { Audience, Category, CategorySlug, ProductType } from "@/lib/types";

export interface PublishedDraft {
  name: string;
  category: CategorySlug;
  audience?: Audience;
  productType?: ProductType;
  priceTzs: number;
  stock: number;
  description: string;
  imageUrl?: string;
}

export interface PublishResult {
  ok: boolean;
  error?: string;
}

type Errors = Partial<Record<"name" | "priceTzs" | "stock" | "description" | "photo", string>>;

export function ProductComposer({ categories, shopName, onPublish }: {
  categories: Category[];
  shopName: string;
  onPublish: (draft: PublishedDraft) => Promise<PublishResult>;
}) {
  const { t } = useI18n();
  const c = t.composer;
  const id = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<CategorySlug>(categories[0]?.slug ?? "fashion");
  const [audience, setAudience] = useState<Audience | "">("");
  const [productType, setProductType] = useState<ProductType | "">("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [description, setDescription] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string>();
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string>();

  // The photo is a local preview only (not uploaded yet), so free its memory
  // whenever it changes or the form unmounts.
  useEffect(() => () => {
    if (photoUrl) URL.revokeObjectURL(photoUrl);
  }, [photoUrl]);

  const apparel = apparelCategories.includes(category);
  const types = productTypes.filter((t) => !audience || t.for.includes(audience as Audience) || t.for.includes("unisex"));

  function choosePhoto(file: File | undefined) {
    if (!file) return;
    const problem = validateImageFile(file);
    if (problem) {
      setErrors((e) => ({ ...e, photo: problem }));
      return;
    }
    // Confirm the browser can actually decode it as an image.
    const url = URL.createObjectURL(file);
    const probe = new Image();
    probe.onload = () => {
      setErrors((e) => ({ ...e, photo: undefined }));
      setPhotoUrl(url);
    };
    probe.onerror = () => {
      URL.revokeObjectURL(url);
      setErrors((e) => ({ ...e, photo: c.notReadableImage }));
    };
    probe.src = url;
  }

  function reset() {
    setName(""); setPrice(""); setStock(""); setDescription(""); setAudience(""); setProductType("");
    setPhotoUrl(undefined);
    if (fileInput.current) fileInput.current.value = "";
  }

  async function publish() {
    const parsed = productDraftSchema.safeParse({
      name, category, priceTzs: price, stock, description,
      audience: apparel && audience ? audience : undefined,
      productType: apparel && productType ? productType : undefined,
    });
    const next: Errors = {};
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof Errors;
        next[key] ??= issue.message;
      }
    }
    setErrors(next);
    if (!parsed.success) return;
    setBusy(true);
    setSubmitError(undefined);
    const res = await onPublish({ ...(parsed.data as PublishedDraft) });
    setBusy(false);
    if (res.ok) reset();
    else setSubmitError(res.error ?? t.sellerProducts.couldNotSave);
  }

  const priceNum = Number(price);
  const stockNum = Number(stock);
  const err = (k: keyof Errors) =>
    errors[k] ? <p id={`${id}-${k}-err`} className="mt-1 text-xs text-red-700">{errors[k]}</p> : null;
  const aria = (k: keyof Errors) => ({ "aria-invalid": Boolean(errors[k]), "aria-describedby": errors[k] ? `${id}-${k}-err` : undefined });

  return (
    <section aria-labelledby={`${id}-title`} className="rounded-2xl border border-line bg-white p-5">
      <h2 id={`${id}-title`} className="font-semibold">{c.addProduct}</h2>
      <p className="text-sm text-muted">{c.previewHint}</p>

      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_20rem]">
        <form noValidate onSubmit={(e) => { e.preventDefault(); publish(); }} className="space-y-4">
          {/* Photo */}
          <div>
            <span className="text-sm font-medium">{c.photo}</span>
            <div className="mt-1 flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-xl border-2 border-dashed border-line bg-subtle text-muted hover:border-brand-400"
              >
                {photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoUrl} alt={c.selectedPhotoAlt} className="h-full w-full object-cover" />
                ) : (
                  <ImagePlus aria-hidden="true" />
                )}
                <span className="sr-only">{photoUrl ? c.changePhoto : c.choosePhoto}</span>
              </button>
              <div className="text-xs text-muted">
                <label htmlFor={`${id}-photo`} className="font-semibold text-brand-700 hover:underline">
                  {photoUrl ? c.changePhoto : c.chooseAPhoto}
                </label>
                <p>{c.photoHint}</p>
                {photoUrl && (
                  <button type="button" onClick={() => { setPhotoUrl(undefined); if (fileInput.current) fileInput.current.value = ""; }} className="mt-1 inline-flex items-center gap-1 text-red-700 hover:underline">
                    <X size={12} aria-hidden="true" /> {c.remove}
                  </button>
                )}
              </div>
              <input
                ref={fileInput}
                id={`${id}-photo`}
                type="file"
                accept={IMAGE_TYPES.join(",")}
                className="sr-only"
                onChange={(e) => choosePhoto(e.target.files?.[0])}
                {...aria("photo")}
              />
            </div>
            {err("photo")}
          </div>

          <div>
            <label htmlFor={`${id}-name`} className="text-sm font-medium">{c.productName}</label>
            <input id={`${id}-name`} value={name} onChange={(e) => setName(e.target.value)} placeholder={c.productNamePlaceholder} className={`${compactInputClass} mt-1`} {...aria("name")} />
            {err("name")}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor={`${id}-cat`} className="text-sm font-medium">{t.search.category}</label>
              <select id={`${id}-cat`} value={category} onChange={(e) => setCategory(e.target.value as CategorySlug)} className={`${compactInputClass} mt-1`}>
                {categories.map((cat) => <option key={cat.slug} value={cat.slug}>{t.categories[cat.slug as keyof Dictionary["categories"]] ?? cat.name}</option>)}
              </select>
            </div>
            {apparel && (
              <>
                <div>
                  <label htmlFor={`${id}-aud`} className="text-sm font-medium">{c.forLabel}</label>
                  <select id={`${id}-aud`} value={audience} onChange={(e) => { setAudience(e.target.value as Audience | ""); setProductType(""); }} className={`${compactInputClass} mt-1`}>
                    <option value="">{c.choose}</option>
                    {audiences.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor={`${id}-type`} className="text-sm font-medium">{c.type}</label>
                  <select id={`${id}-type`} value={productType} onChange={(e) => setProductType(e.target.value as ProductType | "")} className={`${compactInputClass} mt-1`}>
                    <option value="">{c.choose}</option>
                    {types.map((pt) => <option key={pt.id} value={pt.id}>{pt.label}</option>)}
                  </select>
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={`${id}-price`} className="text-sm font-medium">{t.sellerProducts.colPrice}</label>
              <input id={`${id}-price`} type="number" inputMode="numeric" min={100} step={100} value={price} onChange={(e) => setPrice(e.target.value)} className={`${compactInputClass} mt-1`} {...aria("priceTzs")} />
              {err("priceTzs")}
            </div>
            <div>
              <label htmlFor={`${id}-stock`} className="text-sm font-medium">{t.sellerProducts.colStock}</label>
              <input id={`${id}-stock`} type="number" inputMode="numeric" min={0} step={1} value={stock} onChange={(e) => setStock(e.target.value)} className={`${compactInputClass} mt-1`} {...aria("stock")} />
              {err("stock")}
            </div>
          </div>

          <div>
            <label htmlFor={`${id}-desc`} className="text-sm font-medium">{c.description}</label>
            <textarea
              id={`${id}-desc`}
              rows={4}
              maxLength={1000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={c.descriptionPlaceholder}
              className={`${compactInputClass} mt-1 h-auto py-2`}
              {...aria("description")}
            />
            <div className="flex justify-between">
              {err("description") ?? <span />}
              <span className="text-xs text-muted">{description.trim().length}/1000</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={busy}>{busy ? t.seller.saving : c.publish}</Button>
            <Button type="button" variant="ghost" onClick={reset} disabled={busy}>{c.clear}</Button>
          </div>
          {submitError && <p role="alert" className="text-sm text-red-700">{submitError}</p>}
          <p className="text-xs text-muted">{c.footerNote}</p>
        </form>

        {/* Live preview */}
        <aside aria-label={c.customerPreview} className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{c.customerPreview}</p>
          <div className="overflow-hidden rounded-2xl border border-line bg-white">
            <ProductImage category={category} name={name || c.newProduct} imageUrl={photoUrl} />
            <div className="space-y-1.5 p-3">
              <p className="flex items-center gap-1 truncate text-xs text-muted"><Store size={12} aria-hidden="true" /> {shopName}</p>
              <p className="line-clamp-2 text-sm font-semibold">{name || c.productNameFallback}</p>
              <Price amount={Number.isFinite(priceNum) && priceNum > 0 ? priceNum : 0} />
              <StockBadge stock={Number.isFinite(stockNum) ? stockNum : 0} />
            </div>
          </div>
          <div className="rounded-2xl bg-subtle p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{c.onProductPage}</p>
            <p className="mt-1 whitespace-pre-line text-sm text-ink">{description || c.descAppears}</p>
          </div>
        </aside>
      </div>
    </section>
  );
}
