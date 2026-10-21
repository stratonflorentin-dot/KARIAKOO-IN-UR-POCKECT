"use client";

import { useActionState } from "react";
import { createPromotion, type PromotionActionState } from "@/app/[lang]/seller/advertising/actions";
import { Button } from "@/components/ui/Button";
import { Field, inputClass } from "@/components/ui/Field";
import type { SellerProductLive } from "@/lib/data/seller-live";

const initial: PromotionActionState = { status: "idle" };

export function PromotionComposer({ products }: { products: SellerProductLive[] }) {
  const [state, action, pending] = useActionState<PromotionActionState, FormData>(createPromotion, initial);
  return (
    <form action={action} className="space-y-4">
      {state.message && <p role={state.status === "error" ? "alert" : "status"} className={`rounded-xl p-3 text-sm ${state.status === "error" ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-800"}`}>{state.message}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="kind" label="Promotion type" hint="Choose how the post is presented.">
          <select id="kind" name="kind" defaultValue="status" className={inputClass}>
            <option value="status">Shop update</option>
            <option value="teaser">Product teaser</option>
            <option value="branding">Shop introduction</option>
          </select>
        </Field>
        <Field id="title" label="Headline" hint="Optional · up to 120 characters.">
          <input id="title" name="title" maxLength={120} className={inputClass} placeholder="New arrivals this week" />
        </Field>
      </div>
      <Field id="body" label="Message" hint="Optional · up to 600 characters.">
        <textarea id="body" name="body" rows={3} maxLength={600} className={`${inputClass} py-3`} placeholder="Tell customers what is new in your shop." />
      </Field>
      <Field id="imageUrl" label="Image URL" hint="Optional. Use a public HTTPS image link. Image upload can be added once seller storage is configured.">
        <input id="imageUrl" name="imageUrl" type="url" inputMode="url" className={inputClass} placeholder="https://example.com/your-promotion.jpg" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="linkProductId" label="Link a product" hint="Optional. Sends customers to an active product in your shop.">
          <select id="linkProductId" name="linkProductId" defaultValue="" className={inputClass}>
            <option value="">Link to my shop</option>
            {products.filter((product) => product.status === "active").map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
          </select>
        </Field>
        <Field id="expiresIn" label="Show for">
          <select id="expiresIn" name="expiresIn" defaultValue="3days" className={inputClass}>
            <option value="1day">1 day</option>
            <option value="3days">3 days</option>
            <option value="7days">7 days</option>
            <option value="always">Always on (shop introduction)</option>
          </select>
        </Field>
      </div>
      <p className="text-xs text-muted">Promotions are currently free shop posts. They appear in the customer store while active; no ad spend is charged.</p>
      <Button type="submit" variant="dark" disabled={pending}>{pending ? "Publishing…" : "Publish promotion"}</Button>
    </form>
  );
}
