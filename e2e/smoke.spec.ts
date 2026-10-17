import { expect, test } from "@playwright/test";

// Smoke coverage: the app boots, `/` sends a signed-out visitor to the sign-in
// screen, and that screen renders. Behavior lives in the auth specs.
test("a signed-out visit to / lands on the sign-in screen", async ({ page }) => {
  const response = await page.goto("/");

  expect(response?.ok()).toBe(true);
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
});
