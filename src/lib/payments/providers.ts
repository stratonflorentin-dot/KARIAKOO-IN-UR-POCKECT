import "server-only";

// Mobile-money methods stay unavailable until the server has a real provider
// adapter, webhook verification and settlement handling. Keys alone do not
// activate a payment flow.
export interface PaymentProviderStatus {
  id: "mpesa" | "mixx" | "airtelmoney" | "halopesa" | "cod";
  label: string;
  configured: boolean;
  note: string;
}

export function getPaymentProviders(): PaymentProviderStatus[] {
  return [
    { id: "mpesa", label: "M-Pesa", configured: false, note: "Payment integration unavailable" },
    { id: "mixx", label: "Mixx by Yas", configured: false, note: "Payment integration unavailable" },
    { id: "airtelmoney", label: "Airtel Money", configured: false, note: "Payment integration unavailable" },
    { id: "halopesa", label: "HaloPesa", configured: false, note: "Payment integration unavailable" },
    { id: "cod", label: "Cash on delivery", configured: true, note: "Pay the rider on arrival" },
  ];
}
