import { describe, expect, it } from "vitest";
import { demoCommissionRules } from "@/data/demo/commission-rules";
import { resolveCommissionBps } from "./commission";

const rate = (shopId: string, category: Parameters<typeof resolveCommissionBps>[1]["category"], at: string) =>
  resolveCommissionBps(demoCommissionRules, { shopId, category, at }).rateBps;

describe("resolveCommissionBps", () => {
  it("uses the 10% default for current orders", () => {
    expect(rate("shop-002", "fabrics", "2026-10-15T12:00:00+03:00")).toBe(1000);
  });

  it("keeps the historical 12% launch rate for 2025 orders", () => {
    expect(rate("shop-002", "fabrics", "2025-12-20T12:00:00+03:00")).toBe(1200);
  });

  it("applies a shop-specific rate over the default", () => {
    expect(rate("shop-005", "groceries", "2026-10-15T12:00:00+03:00")).toBe(700);
    expect(rate("shop-005", "groceries", "2026-05-01T12:00:00+03:00")).toBe(1000); // before it took effect
  });

  it("applies scheduled category rates only from their effective date", () => {
    expect(rate("shop-001", "electronics", "2026-10-31T23:59:00+03:00")).toBe(1000);
    expect(rate("shop-001", "electronics", "2026-11-01T00:00:00+03:00")).toBe(800);
  });

  it("falls back to 10% when no rules exist", () => {
    expect(resolveCommissionBps([], { shopId: "x", category: "fashion", at: "2026-01-01" }).rateBps).toBe(1000);
  });
});
