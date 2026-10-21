"use client";

import { useActionState } from "react";
import { applyAsRider, applyAsSeller, type ApplyState } from "@/app/[lang]/apply/actions";
import { Button } from "@/components/ui/Button";
import { Field, fieldAria, inputClass } from "@/components/ui/Field";
import { useI18n } from "@/i18n/client";
import type { Dictionary } from "@/i18n/dictionaries";
import { SHOP_AREAS } from "@/lib/shop-areas";
import type { Category, DeliveryZone } from "@/lib/types";

const initial: ApplyState = { status: "idle" };

function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{message}</p>;
}

export function SellerApplyForm({ categories }: { categories: Category[] }) {
  const { t } = useI18n();
  const a = t.apply;
  const [state, action, pending] = useActionState<ApplyState, FormData>(applyAsSeller, initial);
  const e = state.errors ?? {};
  const v = state.values ?? {};
  return (
    <form action={action} noValidate className="mt-6 space-y-5">
      <FormError message={state.message} />
      <Field id="name" label={a.shopName} error={e.name}>
        <input id="name" name="name" defaultValue={v.name} autoComplete="organization" className={inputClass} {...fieldAria("name", e.name)} />
      </Field>
      <Field id="category" label={a.mainCategory} hint={a.mainCategoryHint} error={e.category}>
        <select id="category" name="category" defaultValue={v.category ?? ""} className={inputClass} {...fieldAria("category", e.category, "hint")}>
          <option value="" disabled>{a.chooseCategory}</option>
          {categories.map((c) => <option key={c.slug} value={c.slug}>{t.categories[c.slug as keyof Dictionary["categories"]] ?? c.name}</option>)}
        </select>
      </Field>
      <Field id="area" label={a.tradingArea} error={e.area}>
        <select id="area" name="area" defaultValue={v.area ?? ""} className={inputClass} {...fieldAria("area", e.area)}>
          <option value="" disabled>{a.chooseArea}</option>
          {SHOP_AREAS.map((area) => <option key={area.id} value={area.id}>{area.label}</option>)}
        </select>
      </Field>
      <Field id="address" label={a.address} error={e.address}>
        <textarea id="address" name="address" rows={2} defaultValue={v.address} className={`${inputClass} py-3`} {...fieldAria("address", e.address)} />
      </Field>
      <Button type="submit" variant="dark" size="lg" full disabled={pending}>
        {pending ? a.submitting : a.applyToSell}
      </Button>
      <p className="text-xs text-muted">{a.sellerFormNote}</p>
    </form>
  );
}

export function RiderApplyForm({ zones }: { zones: DeliveryZone[] }) {
  const { t } = useI18n();
  const a = t.apply;
  const [state, action, pending] = useActionState<ApplyState, FormData>(applyAsRider, initial);
  const e = state.errors ?? {};
  const v = state.values ?? {};
  return (
    <form action={action} noValidate className="mt-6 space-y-5">
      <FormError message={state.message} />
      <Field id="vehicle" label={a.vehicle} hint={a.vehicleHint} error={e.vehicle}>
        <input id="vehicle" name="vehicle" defaultValue={v.vehicle} className={inputClass} {...fieldAria("vehicle", e.vehicle, "hint")} />
      </Field>
      <Field id="plate" label={a.plate} error={e.plate}>
        <input id="plate" name="plate" defaultValue={v.plate} autoCapitalize="characters" className={inputClass} {...fieldAria("plate", e.plate)} />
      </Field>
      <Field id="base_zone" label={a.workArea} error={e.base_zone}>
        <select id="base_zone" name="base_zone" defaultValue={v.base_zone ?? ""} className={inputClass} {...fieldAria("base_zone", e.base_zone)}>
          <option value="" disabled>{a.chooseAreaRider}</option>
          {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
        </select>
      </Field>
      <Button type="submit" variant="dark" size="lg" full disabled={pending}>
        {pending ? a.submitting : a.applyToRide}
      </Button>
      <p className="text-xs text-muted">{a.riderFormNote}</p>
    </form>
  );
}
