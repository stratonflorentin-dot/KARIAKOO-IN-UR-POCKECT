"use client";

import { useActionState } from "react";
import { applyAsRider, applyAsSeller, type ApplyState } from "@/app/apply/actions";
import { Button } from "@/components/ui/Button";
import { Field, fieldAria, inputClass } from "@/components/ui/Field";
import { SHOP_AREAS } from "@/lib/shop-areas";
import type { Category, DeliveryZone } from "@/lib/types";

const initial: ApplyState = { status: "idle" };

function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{message}</p>;
}

export function SellerApplyForm({ categories }: { categories: Category[] }) {
  const [state, action, pending] = useActionState<ApplyState, FormData>(applyAsSeller, initial);
  const e = state.errors ?? {};
  const v = state.values ?? {};
  return (
    <form action={action} noValidate className="mt-6 space-y-5">
      <FormError message={state.message} />
      <Field id="name" label="Shop / business name" error={e.name}>
        <input id="name" name="name" defaultValue={v.name} autoComplete="organization" className={inputClass} {...fieldAria("name", e.name)} />
      </Field>
      <Field id="category" label="Main category" hint="What you mostly sell." error={e.category}>
        <select id="category" name="category" defaultValue={v.category ?? ""} className={inputClass} {...fieldAria("category", e.category, "hint")}>
          <option value="" disabled>Choose a category</option>
          {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
      </Field>
      <Field id="area" label="Trading area" error={e.area}>
        <select id="area" name="area" defaultValue={v.area ?? ""} className={inputClass} {...fieldAria("area", e.area)}>
          <option value="" disabled>Choose your area</option>
          {SHOP_AREAS.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
        </select>
      </Field>
      <Field id="address" label="Street, building or landmark" error={e.address}>
        <textarea id="address" name="address" rows={2} defaultValue={v.address} className={`${inputClass} py-3`} {...fieldAria("address", e.address)} />
      </Field>
      <Button type="submit" variant="dark" size="lg" full disabled={pending}>
        {pending ? "Submitting…" : "Apply to sell"}
      </Button>
      <p className="text-xs text-muted">Your shop goes live once our team approves it. You can sign in and set up products straight away.</p>
    </form>
  );
}

export function RiderApplyForm({ zones }: { zones: DeliveryZone[] }) {
  const [state, action, pending] = useActionState<ApplyState, FormData>(applyAsRider, initial);
  const e = state.errors ?? {};
  const v = state.values ?? {};
  return (
    <form action={action} noValidate className="mt-6 space-y-5">
      <FormError message={state.message} />
      <Field id="vehicle" label="Vehicle" hint="e.g. Motorbike, Bajaji, Bicycle" error={e.vehicle}>
        <input id="vehicle" name="vehicle" defaultValue={v.vehicle} className={inputClass} {...fieldAria("vehicle", e.vehicle, "hint")} />
      </Field>
      <Field id="plate" label="Number plate" error={e.plate}>
        <input id="plate" name="plate" defaultValue={v.plate} autoCapitalize="characters" className={inputClass} {...fieldAria("plate", e.plate)} />
      </Field>
      <Field id="base_zone" label="Area you usually work in" error={e.base_zone}>
        <select id="base_zone" name="base_zone" defaultValue={v.base_zone ?? ""} className={inputClass} {...fieldAria("base_zone", e.base_zone)}>
          <option value="" disabled>Choose an area</option>
          {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
        </select>
      </Field>
      <Button type="submit" variant="dark" size="lg" full disabled={pending}>
        {pending ? "Submitting…" : "Apply to ride"}
      </Button>
      <p className="text-xs text-muted">You can start accepting jobs once our team approves you.</p>
    </form>
  );
}
