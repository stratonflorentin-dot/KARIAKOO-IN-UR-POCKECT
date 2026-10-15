import { expect, test } from "@playwright/test";
import { expectNoHorizontalOverflow } from "./helpers";

test.describe("customer shopping", () => {
  test("search, filter and open a product", async ({ page }) => {
    await page.goto("/customer");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("delivered to your door");

    await page.goto("/customer/search?q=kitenge");
    await expect(page.getByRole("status").first()).toContainText("for “kitenge”");
    await expect(page.getByRole("link", { name: "Tailored Kitenge Dress" })).toBeVisible();

    await page.goto("/customer/search?q=zzqqxx");
    await expect(page.getByText("No products match “zzqqxx”")).toBeVisible();

    await page.goto("/customer/search?category=pharmacy&instock=1&sort=price-asc");
    const prices = await page.locator("article").filter({ hasText: "TSh" }).count();
    expect(prices).toBeGreaterThan(0);
    await expect(page.getByRole("link", { name: "Digital Thermometer" })).toBeVisible();
  });

  test("shop directory distinguishes shop types", async ({ page }) => {
    await page.goto("/customer/shops?type=food");
    await expect(page.getByRole("link", { name: "Mama Lishe Kariakoo Kitchen" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Afya Bora Pharmacy" })).toHaveCount(0);
  });

  test("cart: add, change quantity, remove, multi-shop delivery", async ({ page }) => {
    await page.goto("/customer/product/kitenge-wax-print-6-yards");
    await page.getByRole("button", { name: "Increase quantity" }).click();
    await page.getByRole("button", { name: /Add to cart/ }).click();
    await expect(page.getByText("Added 2 to your cart.")).toBeVisible();

    await page.goto("/customer/product/oraimo-power-bank-20000mah");
    await page.getByRole("button", { name: /Add to cart/ }).click();
    await expect(page.getByText("Added 1 to your cart.")).toBeVisible();

    await page.goto("/customer/cart");
    // Two shops → two fulfilment groups, delivery = Kariakoo 2,000 + 1,000 extra pickup.
    await expect(page.getByRole("heading", { name: /Mama Neema Vitenge/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Msimbazi Mobile Hub/ })).toBeVisible();
    const summary = page.getByRole("complementary");
    await expect(summary).toContainText("TSh 119,000"); // 2 × 32,000 + 55,000
    await expect(summary).toContainText("TSh 3,000");
    await expect(summary).toContainText("TSh 122,000");

    await page.getByRole("group", { name: /Quantity of Kitenge/ }).getByRole("button", { name: "Increase quantity" }).click();
    await expect(summary).toContainText("TSh 151,000");

    await page.getByRole("button", { name: /Remove Oraimo/ }).click();
    await expect(page.getByRole("heading", { name: /Msimbazi Mobile Hub/ })).toHaveCount(0);
    await expect(summary).toContainText("TSh 96,000");
    await expect(summary).toContainText("TSh 2,000");
  });

  test("checkout validates input and shows a server-verified total", async ({ page }) => {
    await page.goto("/customer/product/kyela-rice-5kg");
    await page.getByRole("button", { name: /Add to cart/ }).click();
    await expect(page.getByText("Added 1 to your cart.")).toBeVisible();

    await page.goto("/customer/checkout");
    await page.getByRole("button", { name: "Review order" }).click();
    await expect(page.getByText("Enter your full name.")).toBeVisible();
    await expect(page.getByText(/Enter a Tanzanian mobile number/)).toBeVisible();
    await expect(page.getByText("Choose a payment method.")).toBeVisible();

    await page.getByLabel("Full name").fill("Test Customer");
    await page.getByLabel("Mobile number").fill("0712 345 678");
    await page.getByLabel("Delivery area").selectOption("temeke");
    await page.getByLabel("Street, building or landmark").fill("Mbagala Kuu, near the market");
    // Unconfigured mobile money providers cannot be selected.
    await expect(page.getByRole("radio", { name: /M-Pesa/ })).toBeDisabled();
    await page.getByRole("radio", { name: /Cash on delivery/ }).check();
    await page.getByRole("button", { name: "Review order" }).click();

    const summary = page.getByRole("complementary");
    await expect(summary).toContainText("verified by our server");
    await expect(summary).toContainText("TSh 17,500");
    await expect(summary).toContainText("TSh 6,000");
    await expect(summary).toContainText("TSh 23,500");
    await expect(page.getByRole("button", { name: /Place order/ })).toBeDisabled();
    await expect(summary).toContainText("No order has been created and no payment has been taken");
  });

  test("pages fit the screen without horizontal scrolling", async ({ page }) => {
    for (const path of ["/customer", "/customer/search?q=phone", "/customer/shops", "/customer/product/tecno-spark-20-128gb", "/customer/cart", "/customer/checkout"]) {
      await page.goto(path);
      await expectNoHorizontalOverflow(page);
    }
  });
});

test("mobile shows the bottom navigation", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile only");
  await page.goto("/customer");
  const nav = page.getByRole("navigation", { name: "Customer" });
  await expect(nav).toBeVisible();
  await nav.getByRole("link", { name: "Search" }).click();
  await expect(page).toHaveURL(/\/customer\/search/);
  await expect(nav.getByRole("link", { name: "Search" })).toHaveAttribute("aria-current", "page");
});
