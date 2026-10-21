"use client";

import { ShoppingBag, Store, Trash2 } from "lucide-react";
import Link from "@/components/i18n/Link";
import { LocationSelector } from "@/components/customer/LocationSelector";
import { ButtonLink } from "@/components/ui/Button";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState, Skeleton } from "@/components/ui/States";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n/config";
import { useCart } from "@/lib/cart-store";
import { deliveryFeeFor, getZone } from "@/lib/delivery";
import { formatTzs } from "@/lib/format";
import { useDeliveryZone } from "@/lib/preferences-store";
import { QuantityStepper } from "./QuantityStepper";
import type { CartProductInfo } from "./types";

export function CartView({ catalog }: { catalog: CartProductInfo[] }) {
  const { t } = useI18n();
  const c = t.cart;
  const { lines, hydrated, setQuantity, remove, clear } = useCart();
  const { zone } = useDeliveryZone();
  const byId = new Map(catalog.map((p) => [p.id, p]));

  if (!hydrated) return <Skeleton className="mt-6 h-64" />;

  const items = lines.flatMap((line) => {
    const product = byId.get(line.productId);
    return product ? [{ line, product }] : [];
  });
  const unavailable = lines.length - items.length;

  if (items.length === 0) {
    return (
      <div className="mt-6">
        <EmptyState
          icon={<ShoppingBag size={22} />}
          title={c.emptyTitle}
          body={c.emptyBody}
          action={
            <div className="flex flex-col items-center gap-3">
              <ButtonLink href="/customer">{c.startShopping}</ButtonLink>
              {unavailable > 0 && (
                <button type="button" onClick={clear} className="text-sm text-muted underline">
                  {fmt(c.removeUnavailable, { count: unavailable })}
                </button>
              )}
            </div>
          }
        />
      </div>
    );
  }

  // One fulfilment group per shop: each shop prepares its own items.
  const groups = new Map<string, typeof items>();
  for (const it of items) groups.set(it.product.shopId, [...(groups.get(it.product.shopId) ?? []), it]);

  const subtotal = items.reduce((s, { line, product }) => s + product.priceTzs * line.quantity, 0);
  const delivery = deliveryFeeFor(zone, groups.size);

  return (
    <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_22rem]">
      <section aria-label={c.itemsLabel} className="space-y-4">
        {[...groups.entries()].map(([shopId, groupItems]) => (
          <div key={shopId} className="overflow-hidden rounded-2xl border border-line bg-white">
            <h2 className="flex items-center gap-2 border-b border-line bg-subtle px-4 py-3 text-sm font-semibold">
              <Store size={16} className="text-brand-600" aria-hidden="true" />
              {groupItems[0].product.shopName}
              <span className="font-normal text-muted">{c.packedByShop}</span>
            </h2>
            <ul className="divide-y divide-line">
              {groupItems.map(({ line, product }) => (
                <li key={product.id} className="flex gap-3 p-4 sm:gap-4">
                  <div aria-hidden="true" className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-subtle text-muted sm:h-20 sm:w-20">
                    <CategoryIcon slug={product.category} size={26} />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`/customer/product/${product.slug}`} className="line-clamp-2 font-semibold hover:text-brand-700">{product.name}</Link>
                      <p className="shrink-0 font-semibold tabular-nums">{formatTzs(product.priceTzs * line.quantity)}</p>
                    </div>
                    <p className="text-xs text-muted">{fmt(c.eachPrice, { price: formatTzs(product.priceTzs) })}</p>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <QuantityStepper
                        value={Math.min(line.quantity, Math.max(1, product.maxQuantity))}
                        min={1}
                        max={Math.max(1, product.maxQuantity)}
                        onChange={(q) => setQuantity(product.id, q, product.maxQuantity)}
                        label={fmt(c.quantityOf, { name: product.name })}
                      />
                      <button type="button" onClick={() => remove(product.id)} className="inline-flex h-11 items-center gap-1 rounded-full px-3 text-sm text-muted hover:bg-subtle hover:text-ink">
                        <Trash2 size={16} aria-hidden="true" /> {c.remove}<span className="sr-only"> {product.name}</span>
                      </button>
                    </div>
                    {product.maxQuantity === 0 && <p className="text-sm text-red-700">{c.outOfStock}</p>}
                    {product.maxQuantity > 0 && line.quantity > product.maxQuantity && (
                      <p className="text-sm text-amber-900">{fmt(c.onlyAvailable, { count: product.maxQuantity })}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <ConfirmDialog
          title={c.emptyConfirmTitle}
          body={c.emptyConfirmBody}
          confirmLabel={c.emptyConfirm}
          onConfirm={clear}
          trigger={(open) => (
            <button type="button" onClick={open} className="text-sm font-medium text-muted underline-offset-2 hover:text-red-700 hover:underline">
              {c.emptyConfirm}
            </button>
          )}
        />
      </section>

      <aside aria-labelledby="summary-heading" className="h-fit rounded-2xl border border-line bg-subtle p-5 lg:sticky lg:top-32">
        <h2 id="summary-heading" className="text-lg font-semibold">{c.orderSummary}</h2>
        <div className="mt-3 rounded-xl bg-white px-3 py-2"><LocationSelector /></div>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">{fmt(c.itemsCount, { count: items.reduce((s, i) => s + i.line.quantity, 0) })}</dt>
            <dd className="font-medium tabular-nums">{formatTzs(subtotal)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">{fmt(c.deliveryTo, { zone: getZone(zone).name.split(" (")[0] })}{groups.size > 1 ? fmt(c.deliveryShops, { count: groups.size }) : ""}</dt>
            <dd className="font-medium tabular-nums">{formatTzs(delivery)}</dd>
          </div>
          <div className="flex justify-between border-t border-line pt-3 text-base">
            <dt className="font-semibold">{c.estimatedTotal}</dt>
            <dd className="font-bold tabular-nums">{formatTzs(subtotal + delivery)}</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-muted">{fmt(c.estimateNote, { eta: getZone(zone).etaLabel })}</p>
        <ButtonLink href="/customer/checkout" full size="lg" className="mt-5">{c.continueCheckout}</ButtonLink>
      </aside>
    </div>
  );
}
