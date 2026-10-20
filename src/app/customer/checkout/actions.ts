"use server";

// Checkout review. Everything arriving here is untrusted. We accept only
// product ids, quantities and contact details (validated with Zod), then
// recompute every price, fee and stock limit on the server.
//
// Checkout review validates a quote; placing an order uses the transactional
// database function and configured payment provider.
import { getSessionWithRole } from "@/lib/auth/session";
import { getCatalog } from "@/lib/catalog-source";
import { buildQuote, type QuoteIssue } from "@/lib/pricing";
import { getPaymentProviders } from "@/lib/payments/providers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { checkoutSchema } from "@/lib/validation/checkout";
import type { CartLine, DeliveryZoneId } from "@/lib/types";

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

/* --------------------------- Placing the order --------------------------- */

export interface PlaceState {
  status: "idle" | "error" | "placed";
  message?: string;
  orderId?: string;
  reference?: string;
}

function parseCart(raw: string): CartLine[] {
  try {
    const value = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value
      .map((l) => ({ productId: String(l?.productId ?? ""), quantity: Math.round(Number(l?.quantity)) }))
      .filter((l) => l.productId && Number.isFinite(l.quantity) && l.quantity > 0);
  } catch {
    return [];
  }
}

/**
 * Create a real order via the place_order RPC. The cart carries catalog display
 * ids come from the live catalog. We resolve each to its database UUID by
 * slug before calling the RPC. Prices, fees, commission and stock are all
 * decided server-side by place_order — nothing here trusts the client's totals.
 */
export async function placeOrder(_prev: PlaceState, formData: FormData): Promise<PlaceState> {
  const session = await getSessionWithRole("customer");
  if (!session) return { status: "error", message: "Please sign in to place an order." };

  const raw = {
    name: String(formData.get("name") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    zone: String(formData.get("zone") ?? ""),
    address: String(formData.get("address") ?? ""),
    instructions: String(formData.get("instructions") ?? ""),
    payment: String(formData.get("payment") ?? ""),
  };
  const parsed = checkoutSchema.safeParse(raw);
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Please check your details." };

  const provider = getPaymentProviders().find((p) => p.id === raw.payment);
  if (!provider || !provider.configured) return { status: "error", message: "That payment method is not available yet." };

  const cart = parseCart(String(formData.get("cart") ?? "[]"));
  if (cart.length === 0) return { status: "error", message: "Your cart is empty." };

  // Resolve each cart line's display id to its real product UUID via slug.
  const catalog = await getCatalog();
  const slugById = new Map<string, string>();
  for (const line of cart) {
    const product = catalog.getProduct(line.productId);
    if (!product) return { status: "error", message: "A product in your cart is no longer available." };
    slugById.set(line.productId, product.slug);
  }
  const sb = await createSupabaseServerClient();
  const slugs = [...new Set([...slugById.values()])];
  const { data: rows, error: lookupError } = await sb.from("products").select("id,slug").in("slug", slugs);
  if (lookupError) return { status: "error", message: "Could not verify your cart. Please try again." };
  const uuidBySlug = new Map((rows ?? []).map((r) => [String((r as { slug: string }).slug), String((r as { id: string }).id)]));

  const items = cart.map((line) => ({ product_id: uuidBySlug.get(slugById.get(line.productId)!), quantity: line.quantity }));
  if (items.some((i) => !i.product_id)) return { status: "error", message: "A product in your cart is no longer available." };

  const { data, error } = await sb.rpc("place_order", {
    p_items: items,
    p_zone: parsed.data.zone,
    p_address: parsed.data.address,
    p_payment_method: provider.id,
    p_idempotency_key: String(formData.get("idempotency_key") ?? crypto.randomUUID()),
    p_instructions: parsed.data.instructions ?? "",
  });
  if (error) {
    const message = /sign in/i.test(error.message) ? "Please sign in to place an order." : error.message;
    return { status: "error", message };
  }
  const result = data as { order_id?: string; reference?: string };
  if (!result?.order_id) return { status: "error", message: "Could not place the order. Please try again." };
  return { status: "placed", orderId: result.order_id, reference: result.reference };
}
