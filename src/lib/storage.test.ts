import { describe, expect, it } from "vitest";
import { imageExtForType, PRODUCT_IMAGES_BUCKET, productImagePath, productImagePublicPrefix } from "./storage";

describe("storage helpers", () => {
  it("maps image mime types to extensions, falling back to jpg", () => {
    expect(imageExtForType("image/png")).toBe("png");
    expect(imageExtForType("image/jpeg")).toBe("jpg");
    expect(imageExtForType("image/webp")).toBe("webp");
    expect(imageExtForType("application/pdf")).toBe("jpg");
  });

  it("builds a shop-scoped object path with the right extension", () => {
    const shop = "11111111-1111-1111-1111-111111111111";
    const p = productImagePath(shop, "image/png");
    expect(p.startsWith(`${shop}/`)).toBe(true);
    expect(p.endsWith(".png")).toBe(true);
  });

  it("builds the public URL prefix and trims trailing slashes", () => {
    expect(productImagePublicPrefix("https://x.supabase.co/", "shop1")).toBe(
      `https://x.supabase.co/storage/v1/object/public/${PRODUCT_IMAGES_BUCKET}/shop1/`,
    );
    expect(productImagePublicPrefix("https://x.supabase.co", "shop1")).toBe(
      `https://x.supabase.co/storage/v1/object/public/${PRODUCT_IMAGES_BUCKET}/shop1/`,
    );
  });
});
