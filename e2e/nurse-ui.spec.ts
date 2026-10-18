import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

import { deleteOwnRows, PASSWORD, sessionIdOf } from "./support";

const sessionIds: string[] = [];
const shiftIds: string[] = [];

test.afterAll(async () => {
  await deleteOwnRows({ sessionIds, shiftIds });
});

async function tokenFor(request: APIRequestContext, email: string) {
  const response = await request.post("/api/auth/login", { data: { email, password: PASSWORD } });
  const token = (await response.json()).token as string;
  const sid = sessionIdOf(token);
  if (sid) sessionIds.push(sid);
  return token;
}

async function postShift(request: APIRequestContext, date: string): Promise<string> {
  const token = await tokenFor(request, "admin@sunrisehealth.example");
  const response = await request.post("/api/shifts", {
    headers: { Authorization: `Bearer ${token}` },
    data: { role: "RN", date, startTime: "07:00", endTime: "19:00" },
  });
  expect(response.status()).toBe(201);
  const { id } = await response.json();
  shiftIds.push(id);
  return id;
}

const available = (page: Page) => page.getByRole("region", { name: "Available shifts" });
const mine = (page: Page) => page.getByRole("region", { name: "My shifts" });

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

  test("Maria claims a shift, and it moves to My shifts and stays there after a reload", async ({
    page,
    request,
  }) => {
    await postShift(request, "2027-04-01");
    await signIn(page, "maria.lopez@example.com");

    const row = available(page).getByTestId("shift-list-item").filter({ hasText: "Apr 1, 2027" });
    await row.getByTestId("shift-claim-button").click();

    const banner = page.getByTestId("notification-banner");
    await expect(banner).toContainText("Shift claimed");
    await expect(banner).toContainText("RN on Apr 1, 2027 with Sunrise Health Staffing");
    await expect(available(page).getByText("Apr 1, 2027")).toHaveCount(0);
    await expect(mine(page)).toContainText("Apr 1, 2027");

    await page.reload();
    await expect(available(page).getByText("Apr 1, 2027")).toHaveCount(0);
    await expect(mine(page)).toContainText("Apr 1, 2027");
  });

  test("every claim button stays disabled while a claim is in flight", async ({ page, request }) => {
    await postShift(request, "2027-04-03");
    await signIn(page, "maria.lopez@example.com");
    await page.route("**/api/shifts/*/claim", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await route.continue();
    });

    const buttons = page.getByTestId("shift-claim-button");
    const total = await buttons.count();
    await available(page)
      .getByTestId("shift-list-item")
      .filter({ hasText: "Apr 3, 2027" })
      .getByTestId("shift-claim-button")
      .click();

    for (let index = 0; index < total; index += 1) {
      await expect(buttons.nth(index)).toBeDisabled();
    }
    await expect(page.getByTestId("notification-banner")).toContainText("Shift claimed");
    await expect(buttons.first()).toBeEnabled();
  });

  test("James is rejected on an open shift and it stays open after a reload", async ({ page }) => {
    await signIn(page, "james.cook@example.com");

    const row = available(page).getByTestId("shift-list-item").filter({ hasText: "Oct 2, 2026" });
    await row.getByTestId("shift-claim-button").click();

    await expect(page.getByTestId("notification-banner")).toHaveText(
      /^Credential expired, cannot claim shift/,
    );
    await expect(row).toBeVisible();

    await page.reload();
    await expect(available(page).getByTestId("shift-list-item").filter({ hasText: "Oct 2, 2026" })).toBeVisible();
    await expect(mine(page)).toContainText("You have no assigned shifts yet.");
  });

  test("a shift claimed by someone else first reports it is gone and leaves the list", async ({
    page,
    request,
  }) => {
    const id = await postShift(request, "2027-04-02");
    await signIn(page, "maria.lopez@example.com");
    const row = available(page).getByTestId("shift-list-item").filter({ hasText: "Apr 2, 2027" });
    await expect(row).toBeVisible();

    const rival = await tokenFor(request, "maria.lopez@example.com");
    const taken = await request.post(`/api/shifts/${id}/claim`, {
      headers: { Authorization: `Bearer ${rival}` },
    });
    expect(taken.status()).toBe(200);

    await row.getByTestId("shift-claim-button").click();

    await expect(page.getByTestId("notification-banner")).toContainText("Shift is no longer available");
    await expect(available(page).getByText("Apr 2, 2027")).toHaveCount(0);
  });
});

async function claimedByMaria(request: APIRequestContext, date: string): Promise<string> {
  const id = await postShift(request, date);
  const token = await tokenFor(request, "maria.lopez@example.com");
  const response = await request.post(`/api/shifts/${id}/claim`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(response.status()).toBe(200);
  return id;
}

const myRow = (page: Page, date: string) =>
  mine(page).getByRole("row").filter({ hasText: date });

test.describe("cancelling an assignment", () => {
  test("Maria cancels in advance, and the shift moves to Available shifts and stays there", async ({
    page,
    request,
  }) => {
    await claimedByMaria(request, "2027-07-01");
    await signIn(page, "maria.lopez@example.com");

    await myRow(page, "Jul 1, 2027").getByTestId("shift-cancel-button").click();

    const dialog = page.getByRole("dialog", { name: "Cancel this assignment?" });
    await expect(dialog).toContainText("Jul 1, 2027");
    await expect(dialog.getByLabel("Cancellation reason")).toHaveValue("In advance");
    await dialog.getByRole("button", { name: "Cancel assignment" }).click();

    await expect(dialog).toBeHidden();
    const banner = page.getByTestId("notification-banner");
    await expect(banner).toContainText("Assignment cancelled: RN on Jul 1, 2027 with Sunrise Health Staffing.");
    await expect(banner).toContainText("The shift is open again.");
    await expect(mine(page).getByText("Jul 1, 2027")).toHaveCount(0);
    await expect(available(page).getByText("Jul 1, 2027")).toBeVisible();

    await page.reload();
    await expect(mine(page).getByText("Jul 1, 2027")).toHaveCount(0);
    await expect(available(page).getByText("Jul 1, 2027")).toBeVisible();
  });

  test("the dialog is locked while the cancel is pending", async ({ page, request }) => {
    await claimedByMaria(request, "2027-07-02");
    await signIn(page, "maria.lopez@example.com");
    await page.route("**/api/shifts/*/cancel", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await route.continue();
    });

    await myRow(page, "Jul 2, 2027").getByTestId("shift-cancel-button").click();
    const dialog = page.getByRole("dialog", { name: "Cancel this assignment?" });
    await dialog.getByRole("button", { name: "Cancel assignment" }).click();

    await expect(dialog.getByRole("button", { name: "Cancelling…" })).toBeDisabled();
    await expect(dialog.getByRole("button", { name: "Keep assignment" })).toBeDisabled();
    await expect(dialog.getByRole("button", { name: "Close" })).toBeDisabled();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeVisible();

    await expect(dialog).toBeHidden();
    await expect(page.getByTestId("notification-banner")).toContainText("Assignment cancelled");
  });

  test("a failed cancel keeps the dialog open with the server's message and refreshes the list", async ({
    page,
    request,
  }) => {
    const id = await claimedByMaria(request, "2027-07-03");
    await signIn(page, "maria.lopez@example.com");
    await expect(myRow(page, "Jul 3, 2027")).toBeVisible();

    await myRow(page, "Jul 3, 2027").getByTestId("shift-cancel-button").click();
    const dialog = page.getByRole("dialog", { name: "Cancel this assignment?" });
    const agency = await tokenFor(request, "admin@sunrisehealth.example");
    const taken = await request.post(`/api/shifts/${id}/cancel`, {
      headers: { Authorization: `Bearer ${agency}` },
      data: { reason: "advance" },
    });
    expect(taken.status()).toBe(200);

    await dialog.getByRole("button", { name: "Cancel assignment" }).click();

    const banner = dialog.getByTestId("notification-banner");
    await expect(banner).toHaveText("Shift has no active assignment");
    await expect(banner).toHaveAttribute("role", "alert");
    await expect(dialog).toBeVisible();
    await expect(mine(page).getByText("Jul 3, 2027")).toHaveCount(0);
    await expect(dialog.getByRole("button", { name: "Cancel assignment" })).toBeEnabled();
  });
});
