"use client";

import { CircleCheck, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { placeOrder, reviewCheckout, type CheckoutState, type PlaceState } from "@/app/customer/checkout/actions";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Field, fieldAria, inputClass } from "@/components/ui/Field";
import { EmptyState, Notice } from "@/components/ui/States";
import { useCart } from "@/lib/cart-store";
import { formatTzs } from "@/lib/format";
import { useDeliveryZone } from "@/lib/preferences-store";
import { formatTzPhone } from "@/lib/validation/checkout";
import type { DeliveryZone } from "@/lib/types";

export interface PaymentOption {
  id: string;
  label: string;
  configured: boolean;
  note: string;
}

// A brand-toned chip per method (a coloured initial, not a trademarked logo).
const PAY_CHIP: Record<string, string> = {
  mpesa: "bg-red-500",
  mixx: "bg-sky-500",
  airtelmoney: "bg-red-600",
  halopesa: "bg-orange-500",
  cod: "bg-brand-600",
};

export function CheckoutForm({ zones, payments, canOrder = false }: { zones: DeliveryZone[]; payments: PaymentOption[]; canOrder?: boolean }) {
  const { lines, hydrated, clear } = useCart();
  const { zone: savedZone } = useDeliveryZone();
  const router = useRouter();
  const [state, formAction, pending] = useActionState<CheckoutState, FormData>(reviewCheckout, { status: "idle" });
  const [placeState, placeAction, placing] = useActionState<PlaceState, FormData>(placeOrder, { status: "idle" });
  // A stable idempotency key per visit, so an accidental double-submit is deduped.
  const [idempotencyKey] = useState(() => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now())));
  const v = state.values;
  const e = state.errors ?? {};

  useEffect(() => {
    if (placeState.status === "placed" && placeState.orderId) {
      clear();
      router.push(`/customer/orders/${placeState.orderId}`);
    }
  }, [placeState, clear, router]);

  if (hydrated && lines.length === 0) {
    return <div className="mt-6"><EmptyState title="Your cart is empty" body="Add products before checking out." action={<ButtonLink href="/customer">Start shopping</ButtonLink>} /></div>;
  }

  return (
    <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_24rem]">
      <form action={formAction} noValidate className="space-y-8" aria-describedby="checkout-note">
        {/* Only product ids and quantities are submitted, never prices. */}
        <input type="hidden" name="cart" value={JSON.stringify(lines)} />

        <fieldset className="space-y-4">
          <legend className="text-lg font-semibold">Your details</legend>
          <Field id="name" label="Full name" error={e.name}>
            <input id="name" name="name" autoComplete="name" defaultValue={v?.name} className={inputClass} {...fieldAria("name", e.name)} />
          </Field>
          <Field id="phone" label="Mobile number" hint="Used by the rider and for payment prompts." error={e.phone}>
            <input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="0712 345 678" defaultValue={v?.phone} className={inputClass} {...fieldAria("phone", e.phone, "hint")} />
          </Field>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="text-lg font-semibold">Delivery</legend>
          <Field id="zone" label="Delivery area" error={e.zone}>
            {/* key re-mounts the select once the saved area is read from this device */}
            <select key={hydrated ? "ready" : "ssr"} id="zone" name="zone" defaultValue={v?.zone ?? savedZone} className={inputClass} {...fieldAria("zone", e.zone)}>
              {zones.map((z) => <option key={z.id} value={z.id}>{z.name}: {formatTzs(z.feeTzs)} ({z.etaLabel})</option>)}
            </select>
          </Field>
          <Field id="address" label="Street, building or landmark" error={e.address}>
            <textarea id="address" name="address" rows={2} defaultValue={v?.address} className={`${inputClass} py-3`} {...fieldAria("address", e.address)} />
          </Field>
          <Field id="instructions" label="Instructions for the rider (optional)" error={e.instructions}>
            <input id="instructions" name="instructions" defaultValue={v?.instructions} placeholder="e.g. Call when at the gate" className={inputClass} {...fieldAria("instructions", e.instructions)} />
          </Field>
        </fieldset>

        <fieldset aria-describedby={e.payment ? "payment-error" : "payment-note"}>
          <legend className="text-lg font-semibold">Payment method</legend>
          <p id="payment-note" className="mt-1 text-sm text-muted">Only payment methods connected to KARIAKOO can be selected.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {payments.map((p) => (
              <label
                key={p.id}
                className={`flex min-h-14 items-center gap-3 rounded-xl border px-4 py-2 ${p.configured ? "cursor-pointer border-line has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50" : "cursor-not-allowed border-dashed border-line bg-subtle text-muted"}`}
              >
                <input type="radio" name="payment" value={p.id} disabled={!p.configured} defaultChecked={v?.payment === p.id} className="h-4 w-4 accent-brand-600" />
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold text-white ${p.configured ? PAY_CHIP[p.id] ?? "bg-brand-600" : "bg-stone-300"}`} aria-hidden="true">
                  {p.label.charAt(0)}
                </span>
                <span className="min-w-0 text-sm">
                  <span className="block font-medium">{p.label}</span>
                  <span className="block text-xs">{p.configured ? p.note : "Not connected yet"}</span>
                </span>
              </label>
            ))}
          </div>
          {e.payment && <p id="payment-error" className="mt-2 text-sm text-red-700">{e.payment}</p>}
        </fieldset>

        {e.cart && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{e.cart}</p>}

        <Button type="submit" variant="dark" size="lg" full disabled={pending || !hydrated}>
          {pending ? "Checking prices and stock…" : "Review order"}
        </Button>
        <p id="checkout-note" className="text-xs text-muted">Reviewing does not place an order or charge you.</p>
      </form>

      <aside aria-labelledby="checkout-summary" aria-live="polite" className="h-fit rounded-2xl border border-line bg-subtle p-5 lg:sticky lg:top-32">
        <h2 id="checkout-summary" className="text-lg font-semibold">Order summary</h2>
        {state.status === "verified" && state.verified ? (
          <>
            <p className="mt-1 flex items-center gap-1 text-xs font-medium text-emerald-800">
              <CircleCheck size={14} aria-hidden="true" /> Prices, stock and delivery verified by our server
            </p>
            {state.verified.issues.length > 0 && (
              <ul className="mt-3 space-y-1 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                {state.verified.issues.map((i) => <li key={i.productId}>{i.message}</li>)}
              </ul>
            )}
            <div className="mt-4 space-y-4">
              {state.verified.groups.map((g) => (
                <div key={g.shopName}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">{g.shopName}</p>
                  <ul className="mt-1 space-y-1 text-sm">
                    {g.lines.map((l) => (
                      <li key={l.productId} className="flex justify-between gap-3">
                        <span>{l.quantity} × {l.name}</span>
                        <span className="shrink-0 tabular-nums">{formatTzs(l.lineTotalTzs)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Item subtotal</dt><dd className="tabular-nums">{formatTzs(state.verified.merchandiseTzs)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Delivery fee</dt><dd className="tabular-nums">{formatTzs(state.verified.deliveryFeeTzs)}</dd></div>
              <div className="flex justify-between border-t border-line pt-3 text-base"><dt className="font-semibold">Total</dt><dd className="font-bold tabular-nums">{formatTzs(state.verified.customerTotalTzs)}</dd></div>
            </dl>
            <p className="mt-3 text-xs text-muted">
              {state.verified.paymentLabel} · {formatTzPhone(state.verified.phone)}
            </p>
            {canOrder ? (
              <form action={placeAction} className="mt-5">
                <input type="hidden" name="cart" value={JSON.stringify(lines)} />
                <input type="hidden" name="name" value={v?.name ?? ""} />
                <input type="hidden" name="phone" value={v?.phone ?? ""} />
                <input type="hidden" name="zone" value={v?.zone ?? ""} />
                <input type="hidden" name="address" value={v?.address ?? ""} />
                <input type="hidden" name="instructions" value={v?.instructions ?? ""} />
                <input type="hidden" name="payment" value={v?.payment ?? ""} />
                <input type="hidden" name="idempotency_key" value={idempotencyKey} />
                {placeState.status === "error" && (
                  <p role="alert" className="mb-2 rounded-xl bg-red-50 p-3 text-sm text-red-800">{placeState.message}</p>
                )}
                <Button type="submit" variant="gold" full size="lg" disabled={placing}>
                  {placing ? "Placing your order…" : "Place order"}
                </Button>
                <p className="mt-2 text-xs text-muted">We create your order and show a delivery PIN to give the rider on hand-over. Payment is taken by your provider separately.</p>
              </form>
            ) : (
              <>
                <Button disabled full size="lg" className="mt-5">
                  <Lock size={16} aria-hidden="true" /> Place order
                </Button>
                <div className="mt-3">
                  <Notice tone="warning">Sign in as a customer to place this order.</Notice>
                </div>
              </>
            )}
          </>
        ) : (
          <p className="mt-2 text-sm text-muted">
            Fill in your details and select <strong>Review order</strong>. Our server checks each item&apos;s current price and stock
            and calculates delivery for your area.
          </p>
        )}
      </aside>
    </div>
  );
}
