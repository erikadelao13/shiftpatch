import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

import { deleteOwnRows, PASSWORD, sessionIdOf } from "./support";

const sessionIds: string[] = [];
const shiftIds: string[] = [];

test.afterAll(async () => {
  await deleteOwnRows({ sessionIds, shiftIds });
});

async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.getByTestId("login-email-input").fill(email);
  await page.getByTestId("login-password-input").fill(PASSWORD);
  await page.getByTestId("login-submit-button").click();
  await expect(page).toHaveURL(/\/agency$/);

  const cookies = await page.context().cookies();
  const session = cookies.find((cookie) => cookie.name === "shiftpatch_session");
  const sid = session ? sessionIdOf(session.value) : undefined;
  if (sid) sessionIds.push(sid);
}

async function fillForm(page: Page, form: { date: string; start: string; end: string }) {
  await page.getByTestId("agency-post-shift-button").click();
  const dialog = page.getByRole("dialog", { name: "Post a shift" });
  await dialog.getByLabel("Date").fill(form.date);
  await dialog.getByLabel("Start time").fill(form.start);
  await dialog.getByLabel("End time").fill(form.end);
  return dialog;
}

test.describe("the agency board reads the database", () => {
  test("agency-a sees shift-1 and shift-2 and not shift-3", async ({ page }) => {
    await signIn(page, "admin@sunrisehealth.example");

    const open = page.getByRole("row", { name: /Oct 2, 2026/ });
    await expect(open).toContainText("RN");
    await expect(open).toContainText("19:00–07:00 (+1 day)");
    await expect(open).toContainText("Unassigned");
    await expect(open).toContainText("Open");

    const filled = page.getByRole("row", { name: /Oct 3, 2026/ });
    await expect(filled).toContainText("LPN");
    await expect(filled).toContainText("Maria Lopez");
    await expect(filled).toContainText("Filled");

    await expect(page.getByRole("row", { name: /Oct 4, 2026/ })).toHaveCount(0);
  });

  test("agency-b sees shift-3 only", async ({ page }) => {
    await signIn(page, "admin@metrocare.example");

    await expect(page.getByRole("row", { name: /Oct 4, 2026/ })).toBeVisible();
    await expect(page.getByRole("row", { name: /Oct 2, 2026/ })).toHaveCount(0);
    await expect(page.getByRole("row", { name: /Oct 3, 2026/ })).toHaveCount(0);
  });
});

test.describe("posting a shift", () => {
  test("persists, announces, and survives a reload", async ({ page }) => {
    await signIn(page, "admin@sunrisehealth.example");
    const dialog = await fillForm(page, { date: "2031-03-14", start: "19:00", end: "07:00" });

    const posted = page.waitForResponse(
      (response) => response.url().endsWith("/api/shifts") && response.request().method() === "POST",
    );
    await page.getByTestId("agency-post-shift-submit-button").click();
    const body = await (await posted).json();
    shiftIds.push(body.id);

    await expect(dialog).toBeHidden();
    await expect(page.getByTestId("notification-banner")).toHaveText(/Shift posted/);
    await expect(page.getByTestId("agency-post-shift-button")).toBeFocused();

    const row = page.getByRole("row", { name: /Mar 14, 2031/ });
    await expect(row).toContainText("19:00–07:00 (+1 day)");
    await expect(row).toContainText("Open");

    await page.reload();
    await expect(page.getByRole("row", { name: /Mar 14, 2031/ })).toBeVisible();
  });

  test("disables the submit button while the request is pending", async ({ page }) => {
    await signIn(page, "admin@sunrisehealth.example");
    await page.route("**/api/shifts", async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const response = await route.fetch();
      const body = await response.json();
      shiftIds.push(body.id);
      return route.fulfill({ response, json: body });
    });
    await fillForm(page, { date: "2032-04-10", start: "07:00", end: "19:00" });

    const submit = page.getByTestId("agency-post-shift-submit-button");
    await submit.click();
    await expect(submit).toBeDisabled();
    await expect(submit).toHaveText("Posting…");
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page.getByRole("row", { name: /Apr 10, 2032/ })).toBeVisible();
  });

  test("shows a field error and sends nothing when start equals end", async ({ page }) => {
    await signIn(page, "admin@sunrisehealth.example");
    let sent = false;
    page.on("request", (request) => {
      if (request.url().endsWith("/api/shifts") && request.method() === "POST") sent = true;
    });
    const dialog = await fillForm(page, { date: "2033-05-01", start: "07:00", end: "07:00" });

    await page.getByTestId("agency-post-shift-submit-button").click();

    await expect(dialog.getByText("End time must differ from the start time.")).toBeVisible();
    await expect(dialog).toBeVisible();
    expect(sent).toBe(false);
  });

  test("keeps the form and shows the server error when the post fails", async ({ page }) => {
    await signIn(page, "admin@sunrisehealth.example");
    await page.route("**/api/shifts", (route) =>
      route.request().method() === "POST"
        ? route.fulfill({ status: 500, json: { error: "Internal server error" } })
        : route.continue(),
    );
    const dialog = await fillForm(page, { date: "2034-06-02", start: "08:30", end: "16:45" });
    await dialog.getByLabel("Role").selectOption("LPN");

    await page.getByTestId("agency-post-shift-submit-button").click();

    await expect(dialog).toBeVisible();
    const banner = dialog.getByTestId("notification-banner");
    await expect(banner).toHaveText("Internal server error");
    await expect(banner).toHaveAttribute("role", "alert");
    await expect(page.getByTestId("notification-banner")).toHaveCount(1);
    await expect(dialog.getByLabel("Date")).toHaveValue("2034-06-02");
    await expect(dialog.getByLabel("Start time")).toHaveValue("08:30");
    await expect(dialog.getByLabel("End time")).toHaveValue("16:45");
    await expect(dialog.getByLabel("Role")).toHaveValue("LPN");
    await expect(page.getByTestId("agency-post-shift-submit-button")).toBeEnabled();
  });
});

async function tokenFor(request: APIRequestContext, email: string) {
  const response = await request.post("/api/auth/login", { data: { email, password: PASSWORD } });
  const token = (await response.json()).token as string;
  const sid = sessionIdOf(token);
  if (sid) sessionIds.push(sid);
  return token;
}

async function filledByMaria(request: APIRequestContext, date: string): Promise<string> {
  const agency = await tokenFor(request, "admin@sunrisehealth.example");
  const created = await request.post("/api/shifts", {
    headers: { Authorization: `Bearer ${agency}` },
    data: { role: "RN", date, startTime: "07:00", endTime: "19:00" },
  });
  expect(created.status()).toBe(201);
  const { id } = await created.json();
  shiftIds.push(id);

  const maria = await tokenFor(request, "maria.lopez@example.com");
  const claimed = await request.post(`/api/shifts/${id}/claim`, {
    headers: { Authorization: `Bearer ${maria}` },
  });
  expect(claimed.status()).toBe(200);
  return id;
}

const NURSE_TITLE = /Cancel Maria Lopez.s assignment\?/;

test.describe("cancelling an assignment", () => {
  test("a filled row has one cancel button and an open row has none", async ({ page }) => {
    await signIn(page, "admin@sunrisehealth.example");

    await expect(page.getByRole("row", { name: /Oct 3, 2026/ }).getByTestId("shift-cancel-button")).toHaveCount(1);
    await expect(page.getByRole("row", { name: /Oct 2, 2026/ }).getByTestId("shift-cancel-button")).toHaveCount(0);
  });

  test("an advance cancel reopens the row and survives a reload", async ({ page, request }) => {
    await filledByMaria(request, "2027-07-11");
    await signIn(page, "admin@sunrisehealth.example");

    await page.getByRole("row", { name: /Jul 11, 2027/ }).getByTestId("shift-cancel-button").click();

    const dialog = page.getByRole("dialog", { name: NURSE_TITLE });
    await expect(dialog).toContainText("Assigned nurse: Maria Lopez");
    await expect(dialog.getByRole("radio", { name: "In advance" })).toBeChecked();
    await expect(dialog.getByRole("radio", { name: "No-show" })).not.toBeChecked();
    await dialog.getByRole("button", { name: "Cancel assignment" }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByTestId("notification-banner")).toHaveText(
      /^Assignment cancelled: Maria Lopez was unassigned from the RN shift on Jul 11, 2027\. The shift is open again\./,
    );
    const row = page.getByRole("row", { name: /Jul 11, 2027/ });
    await expect(row).toContainText("Open");
    await expect(row).toContainText("Unassigned");
    await expect(row.getByTestId("shift-cancel-button")).toHaveCount(0);

    await page.reload();
    const reloaded = page.getByRole("row", { name: /Jul 11, 2027/ });
    await expect(reloaded).toContainText("Open");
    await expect(reloaded).toContainText("Unassigned");
  });

  test("a no-show changes the confirm label and the banner", async ({ page, request }) => {
    await filledByMaria(request, "2027-07-12");
    await signIn(page, "admin@sunrisehealth.example");

    await page.getByRole("row", { name: /Jul 12, 2027/ }).getByTestId("shift-cancel-button").click();

    const dialog = page.getByRole("dialog", { name: NURSE_TITLE });
    await dialog.getByRole("radio", { name: "No-show" }).check();
    await expect(dialog.getByRole("button", { name: "Cancel assignment" })).toHaveCount(0);
    await dialog.getByRole("button", { name: "Report no-show" }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByTestId("notification-banner")).toHaveText(
      /^No-show reported: Maria Lopez was unassigned from the RN shift on Jul 12, 2027\. The shift is open again\./,
    );
    const row = page.getByRole("row", { name: /Jul 12, 2027/ });
    await expect(row).toContainText("Open");
    await expect(row).toContainText("Unassigned");

    await page.reload();
    await expect(page.getByRole("row", { name: /Jul 12, 2027/ })).toContainText("Unassigned");
  });

  test("the dialog is locked while the cancel is pending", async ({ page, request }) => {
    await filledByMaria(request, "2027-07-13");
    await signIn(page, "admin@sunrisehealth.example");
    await page.route("**/api/shifts/*/cancel", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await route.continue();
    });

    await page.getByRole("row", { name: /Jul 13, 2027/ }).getByTestId("shift-cancel-button").click();
    const dialog = page.getByRole("dialog", { name: NURSE_TITLE });
    await dialog.getByRole("radio", { name: "No-show" }).check();
    await dialog.getByRole("button", { name: "Report no-show" }).click();

    await expect(dialog.getByRole("button", { name: "Reporting…" })).toBeDisabled();
    await expect(dialog.getByRole("button", { name: "Go back" })).toBeDisabled();
    await expect(dialog.getByRole("button", { name: "Close" })).toBeDisabled();
    await expect(dialog.getByRole("radio", { name: "In advance" })).toBeDisabled();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeVisible();

    await expect(dialog).toBeHidden();
    await expect(page.getByTestId("notification-banner")).toContainText("No-show reported");
  });

  test("a failed cancel keeps the dialog open with the server's message and refreshes the list", async ({
    page,
    request,
  }) => {
    const id = await filledByMaria(request, "2027-07-14");
    await signIn(page, "admin@sunrisehealth.example");
    await page.getByRole("row", { name: /Jul 14, 2027/ }).getByTestId("shift-cancel-button").click();
    const dialog = page.getByRole("dialog", { name: NURSE_TITLE });

    const maria = await tokenFor(request, "maria.lopez@example.com");
    const taken = await request.post(`/api/shifts/${id}/cancel`, {
      headers: { Authorization: `Bearer ${maria}` },
      data: { reason: "advance" },
    });
    expect(taken.status()).toBe(200);

    await dialog.getByRole("button", { name: "Cancel assignment" }).click();

    const banner = dialog.getByTestId("notification-banner");
    await expect(banner).toHaveText("Shift has no active assignment");
    await expect(banner).toHaveAttribute("role", "alert");
    await expect(dialog).toBeVisible();
    await expect(page.getByRole("row", { name: /Jul 14, 2027/ })).toContainText("Unassigned");
    await expect(dialog.getByRole("button", { name: "Cancel assignment" })).toBeEnabled();
  });
});
