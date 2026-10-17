import { expect, test } from "@playwright/test";

// Smoke coverage only: proves the app boots and renders in a real browser.
// It is deliberately thin — replace it with real behavior tests once the
// product is defined (see docs/PRODUCT.md).
test("the home page renders", async ({ page }) => {
  const response = await page.goto("/");

  expect(response?.ok()).toBe(true);
  await expect(page.locator("main")).toBeVisible();
});
