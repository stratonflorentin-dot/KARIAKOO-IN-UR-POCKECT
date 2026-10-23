import "server-only";

// Provider-independent payment adapter interface. Each Tanzanian mobile-money
// provider (M-Pesa, Mixx by Yas, Airtel Money, HaloPesa) is slotted in as an
// adapter later. Until a real, credential-backed, webhook-verified adapter
// exists, every mobile-money provider uses `disabledAdapter`, which refuses to
// initiate and never reports a payment as successful. Cash on delivery is not an
// external provider — it is reconciled through the ledger when the rider
// collects — so it is not represented here.

export type PaymentProviderId = "mpesa" | "mixx" | "airtelmoney" | "halopesa";

export interface PaymentInitiation {
  orderId: string;
  amountTzs: number;
  /** Payer mobile number in +255... form (validated by the caller). */
  msisdn: string;
}

export interface PaymentInitiationResult {
  /** The provider's own transaction id, stored for idempotent reconciliation. */
  providerRef: string;
  /** Initiation only ever yields a pending charge; success arrives via webhook. */
  status: "pending";
}

export interface WebhookVerification {
  valid: boolean;
  providerRef?: string;
  event?: "succeeded" | "failed";
  amountTzs?: number;
}

export interface PaymentAdapter {
  readonly id: PaymentProviderId;
  readonly label: string;
  /** True only when real credentials AND a working adapter are present. */
  isConfigured(): boolean;
  /** Start a charge. Disabled adapters throw PaymentUnavailableError. */
  initiate(req: PaymentInitiation): Promise<PaymentInitiationResult>;
  /** Verify a provider webhook's signature and parse its result. */
  verifyWebhook(rawBody: string, signature: string | null): WebhookVerification;
}

export class PaymentUnavailableError extends Error {
  constructor(public readonly providerId: string) {
    super(`Payment provider "${providerId}" is not available yet.`);
    this.name = "PaymentUnavailableError";
  }
}

/**
 * A provider that is defined but intentionally inert: it is never configured,
 * refuses to initiate, and rejects every webhook. This keeps the provider
 * listed and the interface honest without faking a payment flow.
 */
export function disabledAdapter(id: PaymentProviderId, label: string): PaymentAdapter {
  return {
    id,
    label,
    isConfigured: () => false,
    async initiate() {
      throw new PaymentUnavailableError(id);
    },
    verifyWebhook: () => ({ valid: false }),
  };
}

/** The registry. Swap a `disabledAdapter` for a real one to enable a provider. */
export const paymentAdapters: Record<PaymentProviderId, PaymentAdapter> = {
  mpesa: disabledAdapter("mpesa", "M-Pesa"),
  mixx: disabledAdapter("mixx", "Mixx by Yas"),
  airtelmoney: disabledAdapter("airtelmoney", "Airtel Money"),
  halopesa: disabledAdapter("halopesa", "HaloPesa"),
};
