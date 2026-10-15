import type { Metadata } from "next";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { Notice } from "@/components/ui/States";
import { deliveryZones } from "@/lib/delivery";
import { getPaymentProviders } from "@/lib/payments/providers";

export const metadata: Metadata = { title: "Checkout" };

export default function CheckoutPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Checkout</h1>
      <div className="mt-3">
        <Notice tone="warning">Preview: you can review a server-verified total, but placing orders and payments are not live yet.</Notice>
      </div>
      <CheckoutForm zones={deliveryZones} payments={getPaymentProviders()} />
    </div>
  );
}
