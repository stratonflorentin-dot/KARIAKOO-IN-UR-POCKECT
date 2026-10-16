import { expect, test, type Page } from "@playwright/test";
import { expectNoHorizontalOverflow, previewAs } from "./helpers";

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP4z8DAwMDAxMDAwMDAAAANHQEDasKb6QAAAABJRU5ErkJggg==",
  "base64",
);

/** Confirm a swipe control by actually dragging its handle to the end. */
async function swipe(page: Page, label: string) {
  const handle = page.getByRole("button", { name: `${label}: swipe right, or press Enter` });
  await expect(handle).toBeEnabled(); // ready once the page has loaded
  // A rider scrolls the control on screen (clear of the bottom tab bar) first.
  await handle.evaluate((el) => el.scrollIntoView({ block: "center" }));
  const box = (await handle.boundingBox())!;
  const track = (await handle.locator("..").boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(track.x + track.width - 10, box.y + box.height / 2, { steps: 12 });
  await page.mouse.up();
}

test.describe("rider app (Bolt-style)", () => {
  test("incoming request pops up with a countdown and can be declined", async ({ page }) => {
    await previewAs(page, "Rider");
    const offer = page.getByRole("alertdialog", { name: "New delivery request" });
    await expect(offer).toBeVisible();
    await expect(offer).toContainText("TSh 4,000");
    await expect(offer).toContainText("Congo Street Footwear");
    await expect(offer).toContainText("Deliver to: Ubungo"); // area only, not the exact address
    await expect(offer).not.toContainText("Kimara Korogwe");
    const timer = offer.getByLabel(/seconds left/);
    const first = Number((await timer.innerText()).replace(/\D/g, ""));
    await page.waitForTimeout(1600);
    expect(Number((await timer.innerText()).replace(/\D/g, ""))).toBeLessThan(first);

    await offer.getByRole("button", { name: "Decline" }).click();
    await expect(offer).toHaveCount(0);
    await expect(page.getByText(/Declined KK-260106/)).toBeVisible();
  });

  test("accepting opens the job ready to go to the shop", async ({ page }) => {
    await previewAs(page, "Rider");
    await page.getByRole("alertdialog").getByRole("button", { name: "Accept" }).click();
    await expect(page).toHaveURL(/\/rider\/jobs\/ord-106\?accepted=1/);
    await expect(page.getByRole("button", { name: /Arrived at shop: swipe right/ })).toBeVisible();
  });

  test("going offline stops requests", async ({ page }) => {
    await previewAs(page, "Rider");
    await page.getByRole("alertdialog").getByRole("button", { name: "Decline" }).click();
    await page.getByRole("button", { name: /Availability: Online/ }).click();
    await page.getByRole("button", { name: /Offline No new requests/ }).click();
    await page.reload();
    await expect(page.getByText("You're offline. You won't get new delivery requests.")).toBeVisible();
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
    await page.getByRole("button", { name: "Go online" }).click();
    await expect(page.getByRole("alertdialog", { name: "New delivery request" })).toBeVisible();
  });

  test("full delivery: swipe steps, checklist with photo, then PIN", async ({ page }) => {
    await previewAs(page, "Rider");
    await page.goto("/rider/jobs/ord-106?accepted=1");

    await swipe(page, "Arrived at shop");
    // Can't collect until every item is checked and there is a photo.
    await expect(page.getByRole("button", { name: /Check items and add photo: swipe right/ })).toBeDisabled();
    await page.getByRole("checkbox", { name: /2 × Maasai Beaded Sandals/ }).check();
    await page.locator('input[type="file"][capture]').setInputFiles({ name: "pickup.png", mimeType: "image/png", buffer: PNG });
    await expect(page.getByRole("img", { name: "Pickup proof photo" })).toBeVisible();
    await swipe(page, "Goods collected");
    await expect(page.getByText(/Goods collected \(demo preview: not saved\)/)).toBeVisible();
    await swipe(page, "Start trip to customer");
    await swipe(page, "Arrived at customer");
    await expect(page.getByLabel(/4-digit delivery PIN/)).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("a short drag does not confirm a step", async ({ page }) => {
    await previewAs(page, "Rider");
    await page.goto("/rider/jobs/ord-102");
    const handle = page.getByRole("button", { name: /Arrived at customer: swipe right/ });
    await expect(handle).toBeEnabled();
    await handle.evaluate((el) => el.scrollIntoView({ block: "center" }));
    const box = (await handle.boundingBox())!;
    await page.mouse.move(box.x + 10, box.y + 10);
    await page.mouse.down();
    await page.mouse.move(box.x + 60, box.y + 10, { steps: 5 });
    await page.mouse.up();
    await expect(page.getByLabel(/4-digit delivery PIN/)).toHaveCount(0);
    await expect(handle).toBeVisible();
  });

  test("earnings show today, this week and payout status", async ({ page }) => {
    await previewAs(page, "Rider");
    await page.goto("/rider/earnings");
    await expect(page.getByText("TSh 4,000").first()).toBeVisible(); // today: 1,500 + 2,500
    await expect(page.getByText("TSh 7,500").first()).toBeVisible(); // this week
    await expect(page.getByRole("link", { name: /KK-260101.*Paid/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /KK-260110.*Pending/ })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("SOS opens emergency numbers and problem reports", async ({ page }) => {
    await previewAs(page, "Rider");
    await page.getByRole("alertdialog").getByRole("button", { name: "Decline" }).click();
    await page.getByRole("button", { name: /SOS/ }).click();
    const sos = page.getByRole("dialog", { name: "Safety & help" });
    await expect(sos.getByRole("link", { name: /112/ })).toHaveAttribute("href", "tel:112");
    await sos.getByRole("radio", { name: "Motorcycle breakdown" }).check();
    await sos.getByRole("button", { name: "Send report" }).click();
    await expect(sos.getByText(/Report saved on this phone: “Motorcycle breakdown”/)).toBeVisible();
  });

  test("busy areas map shows where riders are needed", async ({ page }) => {
    await previewAs(page, "Rider");
    await page.getByRole("alertdialog").getByRole("button", { name: "Decline" }).click();
    await expect(page.getByRole("region", { name: /busy areas/ })).toBeVisible();
    await expect(page.locator(".maplibregl-canvas")).toBeVisible();
  });
});
