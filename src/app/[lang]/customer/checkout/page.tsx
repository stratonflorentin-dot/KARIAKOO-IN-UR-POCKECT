import type { Metadata } from "next";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { Notice } from "@/components/ui/States";
import { getDictionary } from "@/i18n/server";
import { getSession } from "@/lib/auth/session";
import { deliveryZones } from "@/lib/delivery";
import { getPaymentProviders } from "@/lib/payments/providers";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).checkout.title };
}

// Reads the session to decide whether ordering is live for this visitor.
export const instant = false;

export default async function CheckoutPage() {
  const t = await getDictionary();
  const session = await getSession();
  const canOrder = session?.role === "customer";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t.checkout.title}</h1>
      {!canOrder && (
        <div className="mt-3">
          <Notice tone="warning">{t.checkout.reviewOnlyNotice}</Notice>
        </div>
      )}
      <CheckoutForm zones={deliveryZones} payments={getPaymentProviders()} canOrder={canOrder} />
    </div>
  );
}
