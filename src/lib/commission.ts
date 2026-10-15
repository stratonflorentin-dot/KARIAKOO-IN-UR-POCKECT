// Commission rule resolution. Precedence: shop rule > category rule >
// default rule. Within a scope, the latest rule whose effective date is on or
// before the order time wins, so a rate change applies only to future orders.
import { DEFAULT_COMMISSION_BPS } from "@/lib/money";
import type { CategorySlug, CommissionRule } from "@/lib/types";

export function resolveCommissionBps(
  rules: CommissionRule[],
  ctx: { shopId: string; category: CategorySlug; at: string },
): { rateBps: number; rule?: CommissionRule } {
  const at = Date.parse(ctx.at);
  const effective = rules
    .filter((r) => Date.parse(r.effectiveFrom) <= at)
    .sort((a, b) => Date.parse(b.effectiveFrom) - Date.parse(a.effectiveFrom));

  const shopRule = effective.find((r) => r.scope === "shop" && r.target === ctx.shopId);
  if (shopRule) return { rateBps: shopRule.rateBps, rule: shopRule };
  const categoryRule = effective.find((r) => r.scope === "category" && r.target === ctx.category);
  if (categoryRule) return { rateBps: categoryRule.rateBps, rule: categoryRule };
  const defaultRule = effective.find((r) => r.scope === "default");
  if (defaultRule) return { rateBps: defaultRule.rateBps, rule: defaultRule };
  return { rateBps: DEFAULT_COMMISSION_BPS };
}
