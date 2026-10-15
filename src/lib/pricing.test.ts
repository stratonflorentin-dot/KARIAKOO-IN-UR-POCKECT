import { describe, expect, it } from "vitest";
import { buildQuote, MAX_QUANTITY_PER_LINE } from "./pricing";

const NOW = "2026-10-15T12:00:00+03:00";

describe("buildQuote (server-side price validation)", () => {
  it("computes totals from server prices with 10% commission", () => {
    const q = buildQuote([{ productId: "prd-001", quantity: 2 }], "kariakoo", NOW);
    expect(q.merchandiseTzs).toBe(690_000);
    expect(q.deliveryFeeTzs).toBe(2_000);
    expect(q.customerTotalTzs).toBe(692_000);
    expect(q.commissionTzs).toBe(69_000);
    expect(q.groups[0].sellerProceedsTzs).toBe(621_000);
    expect(q.issues).toEqual([]);
  });

  it("ignores any price, fee or commission sent by the client", () => {
    const tampered = [{ productId: "prd-001", quantity: 1, priceTzs: 1, unitPriceTzs: 1, commissionBps: 0, deliveryFeeTzs: 0 }];
    const q = buildQuote(tampered, "kariakoo", NOW);
    expect(q.groups[0].lines[0].unitPriceTzs).toBe(345_000);
    expect(q.groups[0].lines[0].commissionBps).toBe(1000);
    expect(q.customerTotalTzs).toBe(347_000);
  });

  it("creates one fulfilment group per shop and charges an extra pickup fee", () => {
    const q = buildQuote(
      [
        { productId: "prd-001", quantity: 1 },
        { productId: "prd-005", quantity: 2 },
      ],
      "kinondoni",
      NOW,
    );
    expect(q.groups.map((g) => g.shopId)).toEqual(["shop-001", "shop-002"]);
    expect(q.deliveryFeeTzs).toBe(5_000 + 1_000);
    expect(q.commissionTzs).toBe(34_500 + 6_400);
  });

  it("applies the shop-specific rate and scheduled rates by date", () => {
    expect(buildQuote([{ productId: "prd-014", quantity: 2 }], "ilala", NOW).commissionTzs).toBe(2_450);
    expect(buildQuote([{ productId: "prd-001", quantity: 1 }], "ilala", "2026-11-02T10:00:00+03:00").commissionTzs).toBe(27_600);
  });

  it("caps quantity at stock and at the per-line maximum", () => {
    const q = buildQuote([{ productId: "prd-003", quantity: 10 }], "ilala", NOW);
    expect(q.groups[0].lines[0].quantity).toBe(3);
    expect(q.issues[0].message).toMatch(/Only 3/);
    expect(buildQuote([{ productId: "prd-005", quantity: 50 }], "ilala", NOW).groups[0].lines[0].quantity).toBe(MAX_QUANTITY_PER_LINE);
  });

  it("rejects out-of-stock, unknown, archived and unapproved-shop products", () => {
    const q = buildQuote(
      ["prd-004", "nope", "prd-026", "prd-019"].map((productId) => ({ productId, quantity: 1 })),
      "ilala",
      NOW,
    );
    expect(q.groups).toHaveLength(0);
    expect(q.customerTotalTzs).toBe(0);
    expect(q.issues).toHaveLength(4);
  });

  it("rejects bad quantities and ignores duplicates and garbage", () => {
    const q = buildQuote(
      [
        { productId: "prd-001", quantity: 0 },
        { productId: "prd-002", quantity: -3 },
        { productId: "prd-005", quantity: 1.5 },
        { productId: "prd-006", quantity: "lots" },
        { productId: "prd-014", quantity: 1 },
        { productId: "prd-014", quantity: 19 },
      ],
      "ilala",
      NOW,
    );
    expect(q.issues).toHaveLength(4);
    expect(q.groups[0].lines).toEqual([expect.objectContaining({ productId: "prd-014", quantity: 1 })]);
    expect(buildQuote("not an array", "ilala", NOW).groups).toEqual([]);
    expect(buildQuote([null, 42, {}], "ilala", NOW).groups).toEqual([]);
  });
});
