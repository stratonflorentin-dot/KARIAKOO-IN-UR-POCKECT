"use client";

import { useActionState } from "react";
import { createPromotion, type PromotionActionState } from "@/app/[lang]/seller/advertising/actions";
import { Button } from "@/components/ui/Button";
import { Field, inputClass } from "@/components/ui/Field";
import { useI18n } from "@/i18n/client";
import type { SellerProductLive } from "@/lib/data/seller-live";

const initial: PromotionActionState = { status: "idle" };

export function PromotionComposer({ products }: { products: SellerProductLive[] }) {
  const { t } = useI18n();
  const ad = t.advertising;
  const [state, action, pending] = useActionState<PromotionActionState, FormData>(createPromotion, initial);
  return (
    <form action={action} className="space-y-4">
      {state.message && <p role={state.status === "error" ? "alert" : "status"} className={`rounded-xl p-3 text-sm ${state.status === "error" ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-800"}`}>{state.message}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="kind" label={ad.promType} hint={ad.promTypeHint}>
          <select id="kind" name="kind" defaultValue="status" className={inputClass}>
            <option value="status">{ad.shopUpdate}</option>
            <option value="teaser">{ad.productTeaser}</option>
            <option value="branding">{ad.shopIntro}</option>
          </select>
        </Field>
        <Field id="title" label={ad.headline} hint={ad.headlineHint}>
          <input id="title" name="title" maxLength={120} className={inputClass} placeholder={ad.headlinePlaceholder} />
        </Field>
      </div>
      <Field id="body" label={ad.message} hint={ad.messageHint}>
        <textarea id="body" name="body" rows={3} maxLength={600} className={`${inputClass} py-3`} placeholder={ad.messagePlaceholder} />
      </Field>
      <Field id="imageUrl" label={ad.imageUrl} hint={ad.imageUrlHint}>
        <input id="imageUrl" name="imageUrl" type="url" inputMode="url" className={inputClass} placeholder={ad.imageUrlPlaceholder} />
      </Field>
      <Field id="imageFile" label={ad.uploadImage} hint={ad.uploadImageHint}>
        <input id="imageFile" name="imageFile" type="file" accept="image/jpeg,image/png,image/webp" className={inputClass} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="linkProductId" label={ad.linkProduct} hint={ad.linkProductHint}>
          <select id="linkProductId" name="linkProductId" defaultValue="" className={inputClass}>
            <option value="">{ad.linkToShop}</option>
            {products.filter((product) => product.status === "active").map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
          </select>
        </Field>
        <Field id="expiresIn" label={ad.showFor}>
          <select id="expiresIn" name="expiresIn" defaultValue="3days" className={inputClass}>
            <option value="1day">{ad.day1}</option>
            <option value="3days">{ad.days3}</option>
            <option value="7days">{ad.days7}</option>
            <option value="always">{ad.alwaysOption}</option>
          </select>
        </Field>
      </div>
      <p className="text-xs text-muted">{ad.freeNote}</p>
      <Button type="submit" variant="dark" disabled={pending}>{pending ? ad.publishing : ad.publishPromotion}</Button>
    </form>
  );
}
