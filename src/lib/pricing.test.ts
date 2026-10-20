import { describe, expect, it } from "vitest";
import { buildQuote, MAX_QUANTITY_PER_LINE } from "./pricing";
import { demoCatalog } from "@/data/demo/catalog";
import { demoCommissionRules } from "@/data/demo/commission-rules";

const NOW = "2026-10-15T12:00:00+03:00";
const quote = (lines: unknown, zone: Parameters<typeof buildQuote>[1], at = NOW) => buildQuote(lines, zone, at, demoCatalog, demoCommissionRules);

describe("buildQuote (server-side price validation)", () => {
  it("computes totals from server prices with 10% commission", () => {
    const q = quote([{ productId: "prd-001", quantity: 2 }], "kariakoo");
    expect(q.merchandiseTzs).toBe(690_000);
    expect(q.deliveryFeeTzs).toBe(2_000);
    expect(q.customerTotalTzs).toBe(692_000);
    expect(q.commissionTzs).toBe(69_000);
    expect(q.groups[0].sellerProceedsTzs).toBe(621_000);
    expect(q.issues).toEqual([]);
  });

  it("ignores any price, fee or commission sent by the client", () => {
    const tampered = [{ productId: "prd-001", quantity: 1, priceTzs: 1, unitPriceTzs: 1, commissionBps: 0, deliveryFeeTzs: 0 }];
    const q = quote(tampered, "kariakoo");
    expect(q.groups[0].lines[0].unitPriceTzs).toBe(345_000);
    expect(q.groups[0].lines[0].commissionBps).toBe(1000);
    expect(q.customerTotalTzs).toBe(347_000);
  });

  it("creates one fulfilment group per shop and charges an extra pickup fee", () => {
    const q = quote(
      [
        { productId: "prd-001", quantity: 1 },
        { productId: "prd-005", quantity: 2 },
      ],
      "kinondoni",
    );
    expect(q.groups.map((g) => g.shopId)).toEqual(["shop-001", "shop-002"]);
    expect(q.deliveryFeeTzs).toBe(5_000 + 1_000);
    expect(q.commissionTzs).toBe(34_500 + 6_400);
  });

  it("applies the shop-specific rate and scheduled rates by date", () => {
    expect(quote([{ productId: "prd-014", quantity: 2 }], "ilala").commissionTzs).toBe(2_450);
    expect(quote([{ productId: "prd-001", quantity: 1 }], "ilala", "2026-11-02T10:00:00+03:00").commissionTzs).toBe(27_600);
  });

  it("caps quantity at stock and at the per-line maximum", () => {
    const q = quote([{ productId: "prd-003", quantity: 10 }], "ilala");
    expect(q.groups[0].lines[0].quantity).toBe(3);
    expect(q.issues[0].message).toMatch(/Only 3/);
    expect(quote([{ productId: "prd-005", quantity: 50 }], "ilala").groups[0].lines[0].quantity).toBe(MAX_QUANTITY_PER_LINE);
  });

  it("rejects out-of-stock, unknown, archived and unapproved-shop products", () => {
    const q = quote(
      ["prd-004", "nope", "prd-026", "prd-019"].map((productId) => ({ productId, quantity: 1 })),
      "ilala",
    );
    expect(q.groups).toHaveLength(0);
    expect(q.customerTotalTzs).toBe(0);
    expect(q.issues).toHaveLength(4);
  });

  it("rejects bad quantities and ignores duplicates and garbage", () => {
    const q = quote(
      [
        { productId: "prd-001", quantity: 0 },
        { productId: "prd-002", quantity: -3 },
        { productId: "prd-005", quantity: 1.5 },
        { productId: "prd-006", quantity: "lots" },
        { productId: "prd-014", quantity: 1 },
        { productId: "prd-014", quantity: 19 },
      ],
      "ilala",
    );
    expect(q.issues).toHaveLength(4);
    expect(q.groups[0].lines).toEqual([expect.objectContaining({ productId: "prd-014", quantity: 1 })]);
    expect(quote("not an array", "ilala").groups).toEqual([]);
    expect(quote([null, 42, {}], "ilala").groups).toEqual([]);
  });
});
