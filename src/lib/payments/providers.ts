import "server-only";

// Payment provider registry. A provider is offered to customers only when
// its credentials are configured on the server. Provider selection (fees,
// settlement, marketplace/split-payment support, licensing) must be verified
// with each provider before integration. See README → Payments checklist.
export interface PaymentProviderStatus {
  id: "mpesa" | "mixx" | "airtelmoney" | "halopesa" | "cod";
  label: string;
  configured: boolean;
  note: string;
}

export function getPaymentProviders(): PaymentProviderStatus[] {
  const has = (name: string) => Boolean(process.env[name]);
  return [
    { id: "mpesa", label: "M-Pesa", configured: has("MPESA_API_KEY"), note: "Mobile money" },
    { id: "mixx", label: "Mixx by Yas", configured: has("MIXX_API_KEY"), note: "Mobile money (formerly Tigo Pesa)" },
    { id: "airtelmoney", label: "Airtel Money", configured: has("AIRTEL_MONEY_API_KEY"), note: "Mobile money" },
    { id: "halopesa", label: "HaloPesa", configured: has("HALOPESA_API_KEY"), note: "Mobile money" },
    { id: "cod", label: "Cash on delivery", configured: true, note: "Pay the rider on arrival" },
  ];
}
