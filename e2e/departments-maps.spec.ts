import { expect, test } from "@playwright/test";
import { expectNoHorizontalOverflow, previewAs } from "./helpers";

// A real 2×2 PNG, so the browser can decode it like a phone photo.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP4z8DAwMDAxMDAwMDAAAANHQEDasKb6QAAAABJRU5ErkJggg==",
  "base64",
);

test.describe("departments", () => {
  test("men, women and kids pages with type chips", async ({ page }) => {
    await page.goto("/customer/department/men");
    await expect(page.getByRole("heading", { name: "Men", level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: "Men's Oxford Shirt (Long Sleeve)" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Maasai Beaded Sandals" })).toBeVisible(); // unisex

    await page.getByRole("navigation", { name: "Men product types" }).getByRole("link", { name: "Trousers" }).click();
    await expect(page).toHaveURL(/type=trousers/);
    await expect(page.getByRole("link", { name: "Men's Slim-Fit Chinos" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Men's Oxford Shirt (Long Sleeve)" })).toHaveCount(0);

    await page.goto("/customer/department/women?type=skirts");
    await expect(page.getByRole("link", { name: "Women's Pleated Maxi Skirt" })).toBeVisible();

    await page.goto("/customer/department/kids");
    await expect(page.getByRole("link", { name: "Black Leather School Shoes" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Maasai Beaded Sandals" })).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
  });

  test("search filters by who it is for and type", async ({ page }) => {
    await page.goto("/customer/search?for=women&type=trousers");
    await expect(page.getByRole("link", { name: "Women's High-Waist Trousers" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Men's Slim-Fit Chinos" })).toHaveCount(0);
  });
});

test.describe("seller adds a product with photo and description", () => {
  test("validates, previews and publishes", async ({ page }) => {
    await previewAs(page, "Business owner");
    await page.goto("/seller/products");
    const composer = page.getByRole("region", { name: "Add a product" }).or(page.locator("section", { has: page.getByRole("heading", { name: "Add a product" }) }));

    // Publishing without a photo or details shows clear errors.
    await page.getByRole("button", { name: "Publish (demo)" }).click();
    await expect(page.getByText("Add a photo so customers can see the product.")).toBeVisible();
    await expect(page.getByText("Describe the product in at least 20 characters.")).toBeVisible();

    // A non-image file is refused.
    await page.locator('input[type="file"]').setInputFiles({ name: "notes.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4") });
    await expect(page.getByText("Use a JPG, PNG or WebP photo.")).toBeVisible();

    await page.locator('input[type="file"]').setInputFiles({ name: "shirt.png", mimeType: "image/png", buffer: PNG });
    await expect(composer.getByRole("img", { name: "Selected product photo" })).toBeVisible();

    await page.getByLabel("Product name").fill("Men's Linen Shirt");
    await page.getByLabel("Category").selectOption("accessories");
    await page.getByLabel("For", { exact: true }).selectOption("men");
    await page.getByLabel("Type", { exact: true }).selectOption("watches");
    await page.getByLabel("Price (TSh)").first().fill("35000");
    await page.getByLabel("Stock").first().fill("12");
    await page.getByLabel("Description").fill("Breathable linen shirt for hot Dar es Salaam days.");

    // Live preview shows what customers will see.
    const preview = page.getByRole("complementary", { name: "Customer preview" });
    await expect(preview).toContainText("Men's Linen Shirt");
    await expect(preview).toContainText("TSh 35,000");
    await expect(preview).toContainText("Breathable linen shirt");
    await expect(preview.getByRole("img", { name: "Men's Linen Shirt" })).toBeVisible();

    await page.getByRole("button", { name: "Publish (demo)" }).click();
    await expect(page.getByText(/Published “Men's Linen Shirt” in this preview \(not saved\)/)).toBeVisible();
    const table = page.getByRole("region", { name: "Your products" });
    await expect(table.getByText("Breathable linen shirt for hot Dar es Salaam days.")).toBeVisible();
    await expect(table.getByRole("img", { name: "Men's Linen Shirt" }).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});

test.describe("maps", () => {
  test("customers see a shop map and a shop location", async ({ page }) => {
    await page.goto("/customer/shops");
    await expect(page.getByRole("region", { name: "Map of KARIAKOO shops" })).toBeVisible();
    await expect(page.locator(".maplibregl-canvas")).toBeVisible();
    await page.goto("/customer/shops/kariakoo-mitindo-fashion-house");
    await expect(page.getByRole("region", { name: /Map showing Kariakoo Mitindo/ })).toBeVisible();
    await expect(page.getByRole("link", { name: "Get directions" })).toHaveAttribute("href", /google\.com\/maps\/dir/);
    await expectNoHorizontalOverflow(page);
  });

  test("customers see their order's delivery route", async ({ page }) => {
    await previewAs(page, "Customer");
    await page.goto("/customer/orders/ord-102");
    await expect(page.getByRole("region", { name: /where your order is collected and delivered/ })).toBeVisible();
    await expect(page.getByText(/live position is not tracked yet/)).toBeVisible();
  });

  test("shop owners see their shop on the map", async ({ page }) => {
    await previewAs(page, "Business owner");
    await expect(page.getByRole("heading", { name: "Your shop on the map" })).toBeVisible();
    await expect(page.getByRole("region", { name: /Map showing Msimbazi Mobile Hub/ })).toBeVisible();
    await expect(page.locator(".maplibregl-canvas")).toBeVisible();
  });
});
