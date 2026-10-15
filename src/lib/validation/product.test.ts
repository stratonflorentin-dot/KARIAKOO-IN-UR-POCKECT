import { describe, expect, it } from "vitest";
import { MAX_IMAGE_BYTES, productDraftSchema, validateImageFile } from "./product";

const valid = { name: "Men's Linen Shirt", category: "fashion", audience: "men", productType: "shirts", priceTzs: "35000", stock: "12", description: "Breathable linen shirt for hot Dar es Salaam days." };

describe("productDraftSchema", () => {
  it("accepts a valid product and converts numbers", () => {
    const r = productDraftSchema.safeParse(valid);
    expect(r.success).toBe(true);
    expect(r.success && r.data.priceTzs).toBe(35000);
  });

  it("rejects bad prices, stock and short descriptions", () => {
    const r = productDraftSchema.safeParse({ ...valid, priceTzs: "99.5", stock: "-1", description: "Nice" });
    expect(r.success).toBe(false);
    expect(r.error!.issues.map((i) => i.path[0]).sort()).toEqual(["description", "priceTzs", "stock"]);
  });

  it("rejects unknown departments and types", () => {
    expect(productDraftSchema.safeParse({ ...valid, audience: "aliens" }).success).toBe(false);
    expect(productDraftSchema.safeParse({ ...valid, productType: "spacesuits" }).success).toBe(false);
  });
});

describe("validateImageFile", () => {
  it("accepts JPG, PNG and WebP up to 5 MB", () => {
    expect(validateImageFile({ type: "image/jpeg", size: 200_000 })).toBeNull();
    expect(validateImageFile({ type: "image/webp", size: MAX_IMAGE_BYTES })).toBeNull();
  });

  it("rejects other types, oversize and empty files", () => {
    expect(validateImageFile({ type: "image/svg+xml", size: 1000 })).toMatch(/JPG, PNG or WebP/);
    expect(validateImageFile({ type: "application/pdf", size: 1000 })).toMatch(/JPG, PNG or WebP/);
    expect(validateImageFile({ type: "image/png", size: MAX_IMAGE_BYTES + 1 })).toMatch(/5 MB/);
    expect(validateImageFile({ type: "image/png", size: 0 })).toMatch(/empty/);
  });
});
