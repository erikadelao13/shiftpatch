import { expect, test, type Page } from "@playwright/test";

import { deleteOwnRows, PASSWORD, sessionIdOf } from "./support";

const sessionIds: string[] = [];

test.afterAll(async () => {
  await deleteOwnRows({ sessionIds, shiftIds: [] });
});

async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.getByTestId("login-email-input").fill(email);
  await page.getByTestId("login-password-input").fill(PASSWORD);
  await page.getByTestId("login-submit-button").click();
  await expect(page).toHaveURL(/\/nurse$/);

  const cookies = await page.context().cookies();
  const session = cookies.find((cookie) => cookie.name === "shiftpatch_session");
  const sid = session ? sessionIdOf(session.value) : undefined;
  if (sid) sessionIds.push(sid);
}

test.describe("the nurse marketplace", () => {
  test("Maria sees valid credentials, both agencies' open shifts and her own shift", async ({ page }) => {
    await signIn(page, "maria.lopez@example.com");

    await expect(page.getByRole("heading", { name: "Find your next shift." })).toBeVisible();
    const credential = page.getByTestId("credential-status");
    await expect(credential).toHaveAttribute("data-state", "valid");
    await expect(credential).toContainText("Expires Jan 1, 2027");

    const sunrise = page.getByTestId("shift-list-item").filter({ hasText: "Oct 2, 2026" });
    await expect(sunrise).toContainText("Sunrise Health Staffing");
    await expect(sunrise).toContainText("19:00–07:00");
    await expect(sunrise).toContainText("Ends Oct 3");
    await expect(sunrise.getByTestId("shift-claim-button")).toBeEnabled();
    await expect(page.getByTestId("shift-list-item").filter({ hasText: "Oct 4, 2026" })).toContainText(
      "Metro Care Partners",
    );

    const mine = page.getByRole("region", { name: "My shifts" });
    await expect(mine).toContainText("LPN");
    await expect(mine).toContainText("Oct 3, 2026");
    await expect(mine).toContainText("Assigned to you");
  });

  test("filters narrow the open shifts and can be cleared", async ({ page }) => {
    await signIn(page, "maria.lopez@example.com");

    await page.getByLabel("Agency").selectOption("Metro Care Partners");
    await expect(page.getByTestId("shift-list-item")).toHaveCount(1);

    await page.getByLabel("Role").selectOption("LPN");
    await expect(page.getByText("No shifts match these filters.")).toBeVisible();

    await page.getByRole("button", { name: "Clear filters" }).click();
    await expect(page.getByTestId("shift-list-item").first()).toBeVisible();
  });

  test("James sees that his credentials are expired", async ({ page }) => {
    await signIn(page, "james.cook@example.com");

    const credential = page.getByTestId("credential-status");
    await expect(credential).toHaveAttribute("data-state", "expired");
    await expect(credential).toContainText("Expired Jun 1, 2026");
    await expect(page.getByRole("region", { name: "My shifts" })).toContainText(
      "You have no assigned shifts yet.",
    );
  });
});
