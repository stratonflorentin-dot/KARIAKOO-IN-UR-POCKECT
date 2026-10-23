import "server-only";

import { paymentAdapters, type PaymentProviderId } from "./adapter";

// Mobile-money methods stay unavailable until a real provider adapter, webhook
// verification and settlement handling exist — keys alone do not activate a
// payment flow. The mobile-money entries are derived from the adapter registry
// (all disabled today); cash on delivery is always available and reconciled
// through the payment ledger when the rider collects.
export interface PaymentProviderStatus {
  id: PaymentProviderId | "cod";
  label: string;
  configured: boolean;
  note: string;
}

export function getPaymentProviders(): PaymentProviderStatus[] {
  const mobileMoney: PaymentProviderStatus[] = Object.values(paymentAdapters).map((a) => ({
    id: a.id,
    label: a.label,
    configured: a.isConfigured(),
    note: a.isConfigured() ? "Pay from your mobile money account" : "Payment integration unavailable",
  }));
  return [
    ...mobileMoney,
    { id: "cod", label: "Cash on delivery", configured: true, note: "Pay the rider on arrival" },
  ];
}
