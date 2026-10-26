"use client";

import { Briefcase, Bus, CircleCheck, Home, LocateFixed, Lock, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/client";
import { localizePath } from "@/i18n/config";
import { useActionState, useEffect, useRef, useState } from "react";
import { placeOrder, reviewCheckout, type CheckoutState, type PlaceState } from "@/app/[lang]/customer/checkout/actions";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Field, fieldAria, inputClass } from "@/components/ui/Field";
import { EmptyState, Notice } from "@/components/ui/States";
import { useCart } from "@/lib/cart-store";
import { formatTzs } from "@/lib/format";
import { useDeliveryZone } from "@/lib/preferences-store";
import { formatTzPhone } from "@/lib/validation/checkout";
import { useAppLocation } from "@/components/location/AppLocationProvider";
import { MapLoader } from "@/components/map/MapLoader";
import type { LngLat } from "@/components/map/MarketMap";
import type { DeliveryZone } from "@/lib/types";
import { GROUND_TRANSPORT_VEHICLES, type GroundTransportVehicleId } from "@/lib/parcel-transport";

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
  const { locale, t } = useI18n();
  const { position, requestLocation } = useAppLocation();
  const c = t.checkout;
  const [state, formAction, pending] = useActionState<CheckoutState, FormData>(reviewCheckout, { status: "idle" });
  const [placeState, placeAction, placing] = useActionState<PlaceState, FormData>(placeOrder, { status: "idle" });
  const v = state.values;
  const e = state.errors ?? {};
  // A stable idempotency key per visit, so an accidental double-submit is deduped.
  const [idempotencyKey] = useState(() => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now())));
  const [dropoff, setDropoff] = useState<LngLat | null>(null);
  const [deliveryMode, setDeliveryMode] = useState<"local" | "upcountry">("local");
  const [addressText, setAddressText] = useState(v?.address ?? "");
  const [busCompany, setBusCompany] = useState("Abood Bus");
  const [destinationTown, setDestinationTown] = useState("");
  const [upcountryReceiver, setUpcountryReceiver] = useState("");
  const [selectedVehicleId, setSelectedVehicleId] = useState<GroundTransportVehicleId>("pickup");
  const [instructionsText, setInstructionsText] = useState(v?.instructions ?? "");
  const dropoffWasManuallyPlaced = useRef(false);

  useEffect(() => {
    if (!position || dropoffWasManuallyPlaced.current) return;
    setDropoff([position.lng, position.lat]);
  }, [position]);

  function selectDropoff(location: LngLat) {
    dropoffWasManuallyPlaced.current = true;
    setDropoff(location);
  }

  function useCurrentLocation() {
    dropoffWasManuallyPlaced.current = false;
    if (position) setDropoff([position.lng, position.lat]);
    else requestLocation();
  }

  useEffect(() => {
    if (placeState.status === "placed" && placeState.orderId) {
      clear();
      router.push(localizePath(locale, `/customer/orders/${placeState.orderId}`));
    }
  }, [placeState, clear, router, locale]);

  if (hydrated && lines.length === 0) {
    return <div className="mt-6"><EmptyState title={c.emptyTitle} body={c.emptyBody} action={<ButtonLink href="/customer">{t.cart.startShopping}</ButtonLink>} /></div>;
  }

  return (
    <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_24rem]">
      <form action={formAction} noValidate className="space-y-8" aria-describedby="checkout-note">
        {/* Only product ids and quantities are submitted, never prices. */}
        <input type="hidden" name="cart" value={JSON.stringify(lines)} />

        <fieldset className="space-y-4">
          <legend className="text-lg font-semibold">{c.yourDetails}</legend>
          <Field id="name" label={c.fullName} error={e.name}>
            <input id="name" name="name" autoComplete="name" defaultValue={v?.name} className={inputClass} {...fieldAria("name", e.name)} />
          </Field>
          <Field id="phone" label={c.mobileNumber} hint={c.mobileHint} error={e.phone}>
            <input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="0712 345 678" defaultValue={v?.phone} className={inputClass} {...fieldAria("phone", e.phone, "hint")} />
          </Field>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="text-lg font-semibold">{c.delivery}</legend>

          {/* Dual delivery selector: Local Dar es Salaam vs Upcountry bus parcel */}
          <div className="grid grid-cols-2 gap-2 rounded-2xl border border-line bg-subtle p-1.5 text-xs font-semibold sm:text-sm">
            <button
              type="button"
              onClick={() => {
                setDeliveryMode("local");
                if (addressText.startsWith("Ofisi ya Basi:")) setAddressText("");
              }}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 transition ${
                deliveryMode === "local" ? "bg-white text-brand-800 shadow-sm" : "text-muted hover:text-ink"
              }`}
            >
              <Home size={15} className="shrink-0" />
              <span>Dar es Salaam (Mlangoni)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setDeliveryMode("upcountry");
                const upcountryTemplate = `Ofisi ya Basi: ${busCompany} (Kituo cha Kariakoo / Mbezi Luis) — Mji: ${destinationTown || "Mkoani"}, Mpokeaji: ${upcountryReceiver || "Jina na Simu"}`;
                setAddressText(upcountryTemplate);
              }}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 transition ${
                deliveryMode === "upcountry" ? "bg-white text-brand-800 shadow-sm" : "text-muted hover:text-ink"
              }`}
            >
              <Bus size={15} className="shrink-0 text-amber-600" />
              <span>Mizigo ya Mikoani (Ofisi ya Basi)</span>
            </button>
          </div>

          {deliveryMode === "upcountry" && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-950 sm:text-sm">
              <p className="font-semibold text-amber-900">Huduma ya Kusafirisha Mizigo ya Mikoani</p>
              <p className="mt-1 leading-relaxed text-amber-800">
                Rider wetu atakabidhi mzigo wako kwenye ofisi ya basi Kariakoo au Mbezi Luis, atalipa stakabadhi ya basi (waybill), na kukutumia namba ya stakabadhi ili ukachukue mzigo wako mkoani kwako.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="bus-company" className="block text-xs font-medium text-amber-900">Kampuni ya Basi</label>
                  <select
                    id="bus-company"
                    value={busCompany}
                    onChange={(e) => {
                      setBusCompany(e.target.value);
                      setAddressText(`Ofisi ya Basi: ${e.target.value} (Kariakoo / Mbezi Luis) — Mji: ${destinationTown || "Mkoani"}, Mpokeaji: ${upcountryReceiver || "Jina na Simu"}`);
                    }}
                    className="mt-1 h-10 w-full rounded-xl border border-amber-200 bg-white px-3 text-xs text-ink outline-none"
                  >
                    <option value="Abood Bus">Abood Bus (Morogoro, Dodoma, Mbeya)</option>
                    <option value="BM Coach">BM Coach (Kilimanjaro, Arusha, Mwanza)</option>
                    <option value="Shabiby Line">Shabiby Line (Dodoma, Singida, Mbeya)</option>
                    <option value="Tahmeed Coach">Tahmeed Coach (Tanga, Mombasa, Arusha)</option>
                    <option value="Al Saedy">Al Saedy (Kagera, Shinyanga, Mwanza)</option>
                    <option value="Kidia One">Kidia One (Moshi, Arusha)</option>
                    <option value="Kilimanjaro Express">Kilimanjaro Express</option>
                    <option value="Azam Marine">Azam Marine / SeaLink (Zanzibar Ferry)</option>
                    <option value="Ofisi ya Basi Kariakoo">Ofisi Nyingine ya Basi (Kariakoo)</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="dest-town" className="block text-xs font-medium text-amber-900">Mkoa / Mji unaoenda Mzigo</label>
                  <input
                    id="dest-town"
                    type="text"
                    placeholder="Mf. Mwanza, Arusha, Dodoma, Zanzibar"
                    value={destinationTown}
                    onChange={(e) => {
                      setDestinationTown(e.target.value);
                      setAddressText(`Ofisi ya Basi: ${busCompany} (Kariakoo / Mbezi Luis) — Mji: ${e.target.value || "Mkoani"}, Mpokeaji: ${upcountryReceiver || "Jina na Simu"}`);
                    }}
                    className="mt-1 h-10 w-full rounded-xl border border-amber-200 bg-white px-3 text-xs text-ink outline-none"
                  >
                  </input>
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="receiver-details" className="block text-xs font-medium text-amber-900">Jina na Namba ya Simu ya Mpokeaji Mkoani</label>
                  <input
                    id="receiver-details"
                    type="text"
                    placeholder="Mf. Juma Bakari — 0754 000 111"
                    value={upcountryReceiver}
                    onChange={(e) => {
                      setUpcountryReceiver(e.target.value);
                      setAddressText(`Ofisi ya Basi: ${busCompany} (Kariakoo / Mbezi Luis) — Mji: ${destinationTown || "Mkoani"}, Mpokeaji: ${e.target.value || "Jina na Simu"}`);
                    }}
                    className="mt-1 h-10 w-full rounded-xl border border-amber-200 bg-white px-3 text-xs text-ink outline-none"
                  >
                  </input>
                </div>
              </div>
            </div>
          )}

          <Field id="zone" label={c.deliveryArea} error={e.zone}>
            {/* key re-mounts the select once the saved area is read from this device */}
            <select key={hydrated ? "ready" : "ssr"} id="zone" name="zone" defaultValue={v?.zone ?? savedZone} className={inputClass} {...fieldAria("zone", e.zone)}>
              {zones.map((z) => <option key={z.id} value={z.id}>{z.name}: {formatTzs(z.feeTzs)} ({z.etaLabel})</option>)}
            </select>
          </Field>

          {/* Ground Parcel Transport Vehicle Selector (Chagua Aina ya Gari) */}
          <div className="space-y-2.5 rounded-2xl border border-line bg-subtle p-3.5 sm:p-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-ink sm:text-sm">
                Aina ya Usafiri wa Mzigo Ardhini (Ground Parcel Transport)
              </label>
              <span className="text-2xs font-semibold text-emerald-800 bg-emerald-100 rounded-md px-2 py-0.5">Chagua Chombo</span>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              Chagua gari inayotosheleza uzito na ukubwa wa mzigo wako kutoka dukani:
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {GROUND_TRANSPORT_VEHICLES.map((vehicle) => {
                const isSelected = selectedVehicleId === vehicle.id;
                return (
                  <button
                    key={vehicle.id}
                    type="button"
                    onClick={() => {
                      setSelectedVehicleId(vehicle.id);
                      setInstructionsText((prev) => {
                        const cleaned = prev.replace(/\[Usafiri:.*?\]\s*/g, "");
                        return `[Usafiri: ${vehicle.name} (${vehicle.cargoDescription})] ${cleaned}`.trim();
                      });
                    }}
                    className={`flex items-center justify-between gap-2.5 rounded-xl border p-2.5 text-left transition ${
                      isSelected
                        ? "border-2 border-emerald-700 bg-white shadow-xs ring-1 ring-emerald-600"
                        : "border-line bg-white/70 hover:bg-white hover:border-emerald-300"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-ink">{vehicle.name}</p>
                      <p className="truncate text-3xs text-muted">{vehicle.cargoDescription}</p>
                      <p className="text-3xs text-stone-500 mt-0.5">
                        Bolt: Base {formatTzs(vehicle.tariff.baseFareTzs)} • {formatTzs(vehicle.tariff.perKmRateTzs)}/km
                      </p>
                    </div>
                    <div className="flex flex-col items-end shrink-0">
                      <div className="h-4 w-4 mb-0.5">
                        {isSelected && <CircleCheck size={14} className="text-emerald-700" />}
                      </div>
                      <span className="text-xs font-extrabold text-emerald-900">{formatTzs(vehicle.baseRateTzs)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {deliveryMode === "local" && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-medium text-muted">Mfumo wa haraka:</span>
              <button
                type="button"
                onClick={() => setAddressText("Nyumbani — Mtaa wa: , Mkabala na: , Lango la rangi: ")}
                className="inline-flex items-center gap-1 rounded-full border border-line bg-subtle px-3 py-1 font-medium text-ink hover:bg-white hover:border-brand-400"
              >
                <Home size={12} className="text-brand-600" /> Nyumbani
              </button>
              <button
                type="button"
                onClick={() => setAddressText("Ofisini / Kazini — Jengo la: , Ghorofa ya: , Chumba / Ofisi: ")}
                className="inline-flex items-center gap-1 rounded-full border border-line bg-subtle px-3 py-1 font-medium text-ink hover:bg-white hover:border-brand-400"
              >
                <Briefcase size={12} className="text-brand-600" /> Ofisini / Kazini
              </button>
            </div>
          )}

          <Field id="address" label={c.address} error={e.address}>
            <textarea
              id="address"
              name="address"
              rows={2}
              value={addressText}
              onChange={(e) => setAddressText(e.target.value)}
              placeholder="Mf. Mtaa wa Lumumba, Mkabala na kituo cha mafuta, Lango la kijani au Ghorofa ya 2"
              className={`${inputClass} py-3`}
              {...fieldAria("address", e.address)}
            />
          </Field>
          <Field id="instructions" label={c.instructions} error={e.instructions}>
            <input
              id="instructions"
              name="instructions"
              value={instructionsText}
              onChange={(e) => setInstructionsText(e.target.value)}
              placeholder={deliveryMode === "upcountry" ? "Rider akabidhi ofisini na kutuma risiti" : c.instructionsPlaceholder}
              className={inputClass}
              {...fieldAria("instructions", e.instructions)}
            />
          </Field>
          <div className="space-y-2">
            <p className="text-sm font-medium">{c.dropoffPin}</p>
            <p className="text-sm text-muted">{c.dropoffPinHint}</p>
            <button type="button" onClick={useCurrentLocation} className="inline-flex h-10 items-center gap-2 rounded-full border border-line px-3 text-sm font-semibold text-brand-800">
              <LocateFixed size={16} aria-hidden="true" /> {c.useMyLocation}
            </button>
            <MapLoader points={[]} ariaLabel={c.dropoffPin} selectedLocation={dropoff} onLocationSelect={selectDropoff} locationPicker heightClass="h-64" />
            {dropoff && <button type="button" className="text-sm font-semibold text-brand-700 underline" onClick={() => { dropoffWasManuallyPlaced.current = true; setDropoff(null); }}>{c.clearDropoffPin}</button>}
            {e.dropoffLat && !dropoff && <p role="alert" className="text-sm text-red-700">{e.dropoffLat}</p>}
            <input type="hidden" name="dropoffLat" value={dropoff?.[1] ?? ""} />
            <input type="hidden" name="dropoffLng" value={dropoff?.[0] ?? ""} />
          </div>
        </fieldset>

        <fieldset aria-describedby={e.payment ? "payment-error" : "payment-note"}>
          <legend className="text-lg font-semibold">{c.paymentMethod}</legend>
          <p id="payment-note" className="mt-1 text-sm text-muted">{c.paymentNote}</p>

          {/* Dar es Salaam Escrow Trust Badge */}
          <div className="mt-3 flex items-start gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3.5 text-xs text-emerald-900">
            <ShieldCheck size={18} className="mt-0.5 shrink-0 text-emerald-700" aria-hidden="true" />
            <div>
              <p className="font-semibold text-emerald-950">Malipo yako yanashikiliwa kwa usalama (Escrow)</p>
              <p className="mt-0.5 leading-relaxed text-emerald-800">
                Pesa inashikiliwa na haitalipwa kwa muuzaji hadi utakapopokea mzigo wako na kumpa mpanda pikipiki PIN ya tarakimu 4.
              </p>
            </div>
          </div>
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
                  <span className="block text-xs">{p.configured ? p.note : c.notConnected}</span>
                </span>
              </label>
            ))}
          </div>
          {e.payment && <p id="payment-error" className="mt-2 text-sm text-red-700">{e.payment}</p>}
        </fieldset>

        {e.cart && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{e.cart}</p>}

        <Button type="submit" variant="dark" size="lg" full disabled={pending || !hydrated}>
          {pending ? c.reviewing : c.reviewOrder}
        </Button>
        <p id="checkout-note" className="text-xs text-muted">{c.reviewNote}</p>
      </form>

      <aside aria-labelledby="checkout-summary" aria-live="polite" className="h-fit rounded-2xl border border-line bg-subtle p-5 lg:sticky lg:top-32">
        <h2 id="checkout-summary" className="text-lg font-semibold">{c.orderSummary}</h2>
        {state.status === "verified" && state.verified ? (
          <>
            <p className="mt-1 flex items-center gap-1 text-xs font-medium text-emerald-800">
              <CircleCheck size={14} aria-hidden="true" /> {c.verified}
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
              <div className="flex justify-between"><dt className="text-muted">{c.itemSubtotal}</dt><dd className="tabular-nums">{formatTzs(state.verified.merchandiseTzs)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">{c.deliveryFee}</dt><dd className="tabular-nums">{formatTzs(state.verified.deliveryFeeTzs)}</dd></div>
              <div className="flex justify-between border-t border-line pt-3 text-base"><dt className="font-semibold">{c.total}</dt><dd className="font-bold tabular-nums">{formatTzs(state.verified.customerTotalTzs)}</dd></div>
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
                <input type="hidden" name="dropoffLat" value={v?.dropoffLat ?? ""} />
                <input type="hidden" name="dropoffLng" value={v?.dropoffLng ?? ""} />
                <input type="hidden" name="payment" value={v?.payment ?? ""} />
                <input type="hidden" name="idempotency_key" value={idempotencyKey} />
                {placeState.status === "error" && (
                  <p role="alert" className="mb-2 rounded-xl bg-red-50 p-3 text-sm text-red-800">{placeState.message}</p>
                )}
                <Button type="submit" variant="gold" full size="lg" disabled={placing}>
                  {placing ? c.placing : c.placeOrder}
                </Button>
                <p className="mt-2 text-xs text-muted">{c.placeNote}</p>
              </form>
            ) : (
              <>
                <Button disabled full size="lg" className="mt-5">
                  <Lock size={16} aria-hidden="true" /> {c.placeOrder}
                </Button>
                <div className="mt-3">
                  <Notice tone="warning">{c.signInToOrder}</Notice>
                </div>
              </>
            )}
          </>
        ) : (
          <p className="mt-2 text-sm text-muted">{c.fillPrompt}</p>
        )}
      </aside>
    </div>
  );
}
