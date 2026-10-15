import "server-only";

// Authoritative checkout pricing. KARIAKOO is the middleman: the customer
// pays KARIAKOO, KARIAKOO pays each shop its merchandise total minus
// commission, and pays the rider from the delivery fee.
//
// Server-only: importing this file from a Client Component fails the build,
// so the browser can never supply or override prices, fees or commission.
import { demoCommissionRules } from "@/data/demo/commission-rules";
import { demoCatalog, type Catalog } from "@/lib/catalog";
import { resolveCommissionBps } from "@/lib/commission";
import { deliveryFeeFor } from "@/lib/delivery";
import { breakdown, lineTotal } from "@/lib/money";
import type { CartLine, DeliveryZoneId } from "@/lib/types";

export const MAX_QUANTITY_PER_LINE = 20;
export const MAX_LINES_PER_ORDER = 30;

/** Rider payout per job by zone (internal cost, not shown to customers). */
const RIDER_PAYOUT_TZS: Record<DeliveryZoneId, number> = {
  kariakoo: 1_500,
  ilala: 2_500,
  kinondoni: 3_500,
  ubungo: 4_000,
  temeke: 4_000,
  kigamboni: 5_500,
};
const RIDER_EXTRA_PICKUP_TZS = 500;

export function riderPayoutFor(zone: DeliveryZoneId, shopCount: number): number {
  if (shopCount <= 0) return 0;
  return RIDER_PAYOUT_TZS[zone] + (shopCount - 1) * RIDER_EXTRA_PICKUP_TZS;
}

export interface QuoteLine {
  productId: string;
  name: string;
  unitPriceTzs: number;
  quantity: number;
  lineTotalTzs: number;
  commissionBps: number;
}

export interface ShopGroup {
  shopId: string;
  shopName: string;
  lines: QuoteLine[];
  merchandiseTzs: number;
  commissionTzs: number;
  sellerProceedsTzs: number;
}

export interface QuoteIssue {
  productId: string;
  message: string;
}

export interface Quote {
  groups: ShopGroup[];
  merchandiseTzs: number;
  deliveryFeeTzs: number;
  customerTotalTzs: number;
  commissionTzs: number;
  riderPayoutTzs: number;
  issues: QuoteIssue[];
}

/**
 * Builds a quote from untrusted cart input. Only product ids and quantities
 * are read; every price, fee and commission rate is looked up here.
 * `at` is the pricing time (used to pick the commission rule in force) and
 * `catalog` is the live catalog (Supabase or demo) to price against.
 */
export function buildQuote(
  rawLines: unknown,
  zone: DeliveryZoneId,
  at: string = new Date().toISOString(),
  catalog: Catalog = demoCatalog,
): Quote {
  const issues: QuoteIssue[] = [];
  const byShop = new Map<string, ShopGroup>();
  const lines = Array.isArray(rawLines) ? rawLines.slice(0, MAX_LINES_PER_ORDER) : [];
  const seen = new Set<string>();

  for (const raw of lines as Partial<CartLine>[]) {
    const productId = typeof raw?.productId === "string" ? raw.productId : "";
    const requested = Number(raw?.quantity);
    if (!productId || seen.has(productId)) continue;
    seen.add(productId);

    const product = catalog.getProduct(productId);
    if (!product) {
      issues.push({ productId, message: "A product in your cart is no longer available." });
      continue;
    }
    if (!Number.isInteger(requested) || requested < 1) {
      issues.push({ productId, message: `Invalid quantity for ${product.name}.` });
      continue;
    }
    if (product.stock <= 0) {
      issues.push({ productId, message: `${product.name} is out of stock.` });
      continue;
    }
    const shop = catalog.getShop(product.shopId);
    if (!shop) {
      issues.push({ productId, message: `${product.name}'s shop is not currently selling.` });
      continue;
    }

    const quantity = Math.min(requested, product.stock, MAX_QUANTITY_PER_LINE);
    if (quantity < requested) {
      issues.push({ productId, message: `Only ${quantity} × ${product.name} can be ordered right now.` });
    }

    const { rateBps } = resolveCommissionBps(demoCommissionRules, { shopId: shop.id, category: product.category, at });
    const group =
      byShop.get(shop.id) ??
      ({ shopId: shop.id, shopName: shop.name, lines: [], merchandiseTzs: 0, commissionTzs: 0, sellerProceedsTzs: 0 } satisfies ShopGroup);
    group.lines.push({
      productId: product.id,
      name: product.name,
      unitPriceTzs: product.priceTzs,
      quantity,
      lineTotalTzs: lineTotal({ unitPriceTzs: product.priceTzs, quantity }),
      commissionBps: rateBps,
    });
    const b = breakdown(group.lines);
    group.merchandiseTzs = b.merchandiseTzs;
    group.commissionTzs = b.commissionTzs;
    group.sellerProceedsTzs = b.sellerProceedsTzs;
    byShop.set(shop.id, group);
  }

  const groups = [...byShop.values()];
  const merchandise = groups.reduce((s, g) => s + g.merchandiseTzs, 0);
  const deliveryFee = deliveryFeeFor(zone, groups.length);
  return {
    groups,
    merchandiseTzs: merchandise,
    deliveryFeeTzs: deliveryFee,
    customerTotalTzs: merchandise + deliveryFee,
    commissionTzs: groups.reduce((s, g) => s + g.commissionTzs, 0),
    riderPayoutTzs: riderPayoutFor(zone, groups.length),
    issues,
  };
}
