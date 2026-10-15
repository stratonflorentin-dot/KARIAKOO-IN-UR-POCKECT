"use server";

// Checkout review. Everything arriving here is untrusted. We accept only
// product ids, quantities and contact details (validated with Zod), then
// recompute every price, fee and stock limit on the server.
//
// Phase 1 does NOT create orders or take payments: it returns a verified
// quote. Order creation (with a database transaction, stock reservation and
// an idempotency key) arrives in Phase 4.
import { getCatalog } from "@/lib/catalog-source";
import { buildQuote, type QuoteIssue } from "@/lib/pricing";
import { getPaymentProviders } from "@/lib/payments/providers";
import { checkoutSchema } from "@/lib/validation/checkout";
import type { DeliveryZoneId } from "@/lib/types";

type FieldName = "name" | "phone" | "zone" | "address" | "instructions" | "payment" | "cart";

export interface VerifiedGroup {
  shopName: string;
  merchandiseTzs: number;
  lines: { productId: string; name: string; quantity: number; unitPriceTzs: number; lineTotalTzs: number }[];
}

export interface CheckoutState {
  status: "idle" | "error" | "verified";
  errors?: Partial<Record<FieldName, string>>;
  values?: Record<Exclude<FieldName, "cart">, string>;
  verified?: {
    groups: VerifiedGroup[];
    merchandiseTzs: number;
    deliveryFeeTzs: number;
    customerTotalTzs: number;
    issues: QuoteIssue[];
    phone: string;
    paymentLabel: string;
  };
}

export async function reviewCheckout(_prev: CheckoutState, formData: FormData): Promise<CheckoutState> {
  const raw = {
    name: String(formData.get("name") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    zone: String(formData.get("zone") ?? ""),
    address: String(formData.get("address") ?? ""),
    instructions: String(formData.get("instructions") ?? ""),
    payment: String(formData.get("payment") ?? ""),
  };

  const errors: CheckoutState["errors"] = {};
  const parsed = checkoutSchema.safeParse(raw);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as FieldName;
      errors[field] ??= issue.message;
    }
  }

  // Only configured providers may be used, whatever the browser submits.
  const provider = getPaymentProviders().find((p) => p.id === raw.payment);
  if (parsed.success && (!provider || !provider.configured)) {
    errors.payment = "That payment method is not available yet.";
  }

  let cart: unknown = [];
  try {
    cart = JSON.parse(String(formData.get("cart") ?? "[]"));
  } catch {
    errors.cart = "Your cart could not be read. Please refresh and try again.";
  }

  if (!parsed.success || Object.keys(errors).length > 0) {
    return { status: "error", errors, values: raw };
  }

  const quote = buildQuote(cart, parsed.data.zone as DeliveryZoneId, new Date().toISOString(), await getCatalog());
  if (quote.groups.length === 0) {
    return { status: "error", errors: { cart: quote.issues[0]?.message ?? "Your cart is empty." }, values: raw };
  }

  // Commission and seller payouts are internal and never sent to customers.
  return {
    status: "verified",
    values: raw,
    verified: {
      groups: quote.groups.map((g) => ({
        shopName: g.shopName,
        merchandiseTzs: g.merchandiseTzs,
        lines: g.lines.map(({ productId, name, quantity, unitPriceTzs, lineTotalTzs }) => ({ productId, name, quantity, unitPriceTzs, lineTotalTzs })),
      })),
      merchandiseTzs: quote.merchandiseTzs,
      deliveryFeeTzs: quote.deliveryFeeTzs,
      customerTotalTzs: quote.customerTotalTzs,
      issues: quote.issues,
      phone: parsed.data.phone,
      paymentLabel: provider!.label,
    },
  };
}
