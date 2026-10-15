import { describe, expect, it } from "vitest";
import { calculateRefund, calculateSettlement, commissionFor, formatBps, orderTotals } from "./money";

describe("commissionFor (10% = 1000 bps)", () => {
  it.each([
    [10_000, 1_000],
    [50_000, 5_000],
    [100_000, 10_000],
    [500_000, 50_000],
  ])("TSh %i → commission TSh %i", (subtotal, expected) => {
    expect(commissionFor(subtotal, 1000)).toBe(expected);
  });

  it("rounds half up to the nearest shilling using integers", () => {
    expect(commissionFor(15, 1000)).toBe(2); // 1.5 → 2
    expect(commissionFor(14, 1000)).toBe(1); // 1.4 → 1
    expect(commissionFor(17_500 * 2, 700)).toBe(2_450);
  });

  it("rejects fractional money and invalid rates", () => {
    expect(() => commissionFor(100.5, 1000)).toThrow(RangeError);
    expect(() => commissionFor(-1, 1000)).toThrow(RangeError);
    expect(() => commissionFor(1000, 10.5)).toThrow(RangeError);
    expect(() => commissionFor(1000, 10_001)).toThrow(RangeError);
  });

  it("formats basis points", () => {
    expect(formatBps(1000)).toBe("10%");
    expect(formatBps(750)).toBe("7.5%");
    expect(formatBps(725)).toBe("7.25%");
  });
});

describe("orderTotals", () => {
  it("matches the spec example: TSh 100,000 + TSh 5,000 delivery", () => {
    const t = orderTotals([{ unitPriceTzs: 50_000, quantity: 2, commissionBps: 1000 }], 5_000);
    expect(t).toEqual({
      merchandiseTzs: 100_000,
      commissionTzs: 10_000,
      sellerProceedsTzs: 90_000,
      deliveryFeeTzs: 5_000,
      customerTotalTzs: 105_000,
    });
  });

  it("excludes delivery from commission and supports per-line rates", () => {
    const t = orderTotals(
      [
        { unitPriceTzs: 100_000, quantity: 1, commissionBps: 1000 },
        { unitPriceTzs: 20_000, quantity: 1, commissionBps: 700 },
      ],
      8_000,
    );
    expect(t.commissionTzs).toBe(10_000 + 1_400);
    expect(t.customerTotalTzs).toBe(128_000);
  });
});

describe("calculateRefund", () => {
  it("reverses commission and deducts seller proceeds", () => {
    const r = calculateRefund({ lines: [{ unitPriceTzs: 38_000, quantity: 1, commissionBps: 1000 }], deliveryRefundTzs: 8_000 });
    expect(r).toEqual({ customerRefundTzs: 46_000, commissionReversedTzs: 3_800, sellerDeductionTzs: 34_200, deliveryRefundTzs: 8_000 });
  });
});

describe("calculateSettlement", () => {
  it("pays proceeds minus refunds plus adjustments", () => {
    const s = calculateSettlement({
      deliveredLines: [{ unitPriceTzs: 100_000, quantity: 1, commissionBps: 1000 }],
      refundDeductionsTzs: 9_000,
      adjustmentsTzs: 500,
    });
    expect(s.netPayableTzs).toBe(90_000 - 9_000 + 500);
  });

  it("never produces a negative payout", () => {
    const s = calculateSettlement({ deliveredLines: [], refundDeductionsTzs: 5_000, adjustmentsTzs: 0 });
    expect(s.netPayableTzs).toBe(0);
  });
});
