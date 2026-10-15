import { expect, type Page } from "@playwright/test";

/** Sign in as a demo role through the development-only preview page. */
export async function previewAs(page: Page, role: "Customer" | "Business owner" | "Rider" | "Admin / founder") {
  await page.goto("/dev");
  await page.getByRole("button", { name: new RegExp(`Preview as ${role.replace("/", "\\/")}`) }).click();
  await page.waitForLoadState("networkidle");
}

/** Fails if the page is wider than the viewport (horizontal scrolling on phones). */
export async function expectNoHorizontalOverflow(page: Page) {
  // Compare against the device width, not window.innerWidth: on phones an
  // over-wide page silently enlarges innerWidth and the browser zooms out.
  const deviceWidth = page.viewportSize()!.width;
  const width = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, window.innerWidth));
  expect(width, "page should fit the phone without zooming out or scrolling sideways").toBeLessThanOrEqual(deviceWidth + 1);
}
