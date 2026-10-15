import { describe, expect, it } from "vitest";
import { AuthorizationError, demoIdentities } from "@/lib/auth/session";
import { platformMetrics } from "./admin-metrics";

describe("platformMetrics", () => {
  const m = platformMetrics(demoIdentities.admin);

  it("keeps GMV separate from platform revenue", () => {
    expect(m.gmvTzs).toBeGreaterThan(m.platformRevenueTzs);
    expect(m.platformRevenueTzs).toBe(m.commissionTzs + m.deliveryFeesTzs);
  });

  it("excludes unpaid and cancelled orders from GMV", () => {
    // ord-103 is unpaid (TSh 85,000) and ord-107 was refunded (TSh 38,000).
    const included = m.sales.map((o) => o.id);
    expect(included).not.toContain("ord-103");
    expect(included).not.toContain("ord-107");
  });

  it("subtracts rider payouts from delivery fees", () => {
    expect(m.deliveryContributionTzs).toBe(m.deliveryFeesTzs - m.riderPayoutsTzs);
  });

  it("totals refunds and pending payments", () => {
    expect(m.refundsTzs).toBe(38_000 + 8_000);
    expect(m.pendingPaymentsCount).toBe(1);
    expect(m.pendingPaymentsTzs).toBe(90_000);
  });

  it("flags orders needing attention", () => {
    expect(m.attention.awaitingRider.map((o) => o.id).sort()).toEqual(["ord-103", "ord-105"]);
    expect(m.attention.failedDeliveries.map((o) => o.id)).toEqual(["ord-109"]);
  });

  it("is admin-only", () => {
    expect(() => platformMetrics(demoIdentities.seller)).toThrow(AuthorizationError);
  });
});
