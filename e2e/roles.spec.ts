import { expect, test } from "@playwright/test";
import { expectNoHorizontalOverflow, previewAs } from "./helpers";

test.describe("role access", () => {
  test("signed-out visitors are kept out of every dashboard", async ({ page }) => {
    await page.context().clearCookies();
    for (const path of ["/admin", "/seller", "/rider", "/customer/orders"]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { name: /This area is for/ })).toBeVisible();
    }
  });

  test("a customer cannot open the admin area", async ({ page }) => {
    await previewAs(page, "Customer");
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "This area is for admins" })).toBeVisible();
    await expect(page.getByText("Gross merchandise value")).toHaveCount(0);
  });

  test("a customer cannot open another customer's order", async ({ page }) => {
    await previewAs(page, "Customer");
    await page.goto("/customer/orders/ord-104"); // belongs to another customer
    await expect(page.getByText("Page not found")).toBeVisible();
    await page.goto("/customer/orders/ord-102");
    await expect(page.getByText("4821")).toBeVisible(); // own delivery PIN
  });
});

test.describe("dashboards", () => {
  test("seller dashboard and order actions", async ({ page }) => {
    await previewAs(page, "Business owner");
    await expect(page).toHaveURL(/\/seller$/);
    await expect(page.getByRole("heading", { name: /Karibu, Msimbazi Mobile Hub/ })).toBeVisible();
    await page.goto("/seller/orders");
    await expect(page.getByText("KK-260104")).toHaveCount(0); // another shop's order
    await page.getByRole("button", { name: "Mark ready for pickup" }).first().click();
    await expect(page.getByText(/demo preview: not saved/).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("admin overview separates GMV from revenue and links work", async ({ page }) => {
    await previewAs(page, "Admin / founder");
    await expect(page.getByRole("heading", { name: "Marketplace overview" })).toBeVisible();
    await expect(page.getByText("Goods sold through KARIAKOO. Not revenue.")).toBeVisible();
    await page.goto("/admin/orders?q=KK-251208");
    await page.getByRole("link", { name: "KK-251208" }).click();
    await expect(page.getByRole("cell", { name: "12%" })).toBeVisible(); // historical rate preserved
    await expectNoHorizontalOverflow(page);
  });

  test("admin moderation requires a reason", async ({ page }) => {
    await previewAs(page, "Admin / founder");
    await page.goto("/admin/shops");
    await page.getByRole("button", { name: "Approve Urembo Beauty Mwenge" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("button", { name: "Approve" })).toBeDisabled();
    await dialog.getByRole("textbox").fill("Documents checked in person");
    await dialog.getByRole("button", { name: "Approve" }).click();
    await expect(page.getByText(/Audit \(demo, not saved\): approve by Founder/)).toBeVisible();
  });

  test("rider completes a delivery only with the correct PIN", async ({ page }) => {
    await previewAs(page, "Rider");
    await expect(page).toHaveURL(/\/rider$/);
    await page.goto("/rider/jobs/ord-102");
    await expect(page.locator(".maplibregl-canvas")).toBeVisible(); // map rendered
    await expect(page.getByRole("region", { name: /Delivery map/ })).toBeVisible();

    // Swipe-to-confirm is keyboard accessible too.
    await page.getByRole("button", { name: /Arrived at customer: swipe right/ }).press("Enter");
    await page.getByLabel(/4-digit delivery PIN/).fill("0000");
    await page.getByRole("button", { name: "Confirm delivery" }).click();
    await expect(page.getByText(/That PIN is not correct/)).toBeVisible();

    await page.getByLabel(/4-digit delivery PIN/).fill("4821");
    await page.getByRole("button", { name: "Confirm delivery" }).click();
    await expect(page.getByText("PIN verified by the server. Delivery confirmed.")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("a rider cannot open another rider's delivery", async ({ page }) => {
    await previewAs(page, "Rider");
    await page.goto("/rider/jobs/ord-104");
    await expect(page.getByText("Page not found")).toBeVisible();
  });
});

test.describe("every dashboard page fits the screen", () => {
  const pages: Record<string, { role: Parameters<typeof previewAs>[1]; paths: string[] }> = {
    seller: { role: "Business owner", paths: ["/seller", "/seller/orders", "/seller/products", "/seller/finances"] },
    rider: { role: "Rider", paths: ["/rider", "/rider/jobs/ord-102", "/rider/jobs/ord-106", "/rider/earnings", "/rider/history", "/rider/profile"] },
    admin: { role: "Admin / founder", paths: ["/admin", "/admin/orders", "/admin/orders/ord-102", "/admin/shops", "/admin/riders", "/admin/customers", "/admin/products", "/admin/commission"] },
    customer: { role: "Customer", paths: ["/customer/orders", "/customer/orders/ord-102", "/customer/profile"] },
  };
  for (const [name, { role, paths }] of Object.entries(pages)) {
    test(name, async ({ page }) => {
      await previewAs(page, role);
      for (const path of paths) {
        await page.goto(path);
        await page.waitForLoadState("networkidle");
        await expectNoHorizontalOverflow(page);
      }
    });
  }
});
