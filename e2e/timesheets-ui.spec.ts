import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

import { createNurse, deleteOwnRows, PASSWORD, sessionIdOf } from "./support";

const sessionIds: string[] = [];
const shiftIds: string[] = [];
const userIds: string[] = [];
const emails: string[] = [];

test.afterAll(async () => {
  await deleteOwnRows({ sessionIds, shiftIds, userIds, emails });
});

async function tokenFor(request: APIRequestContext, email: string) {
  const response = await request.post("/api/auth/login", { data: { email, password: PASSWORD } });
  const token = (await response.json()).token as string;
  const sid = sessionIdOf(token);
  if (sid) sessionIds.push(sid);
  return token;
}

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

async function openTimesheets(page: Page, email: string) {
  await signIn(page, email);
  await page.getByRole("navigation", { name: "Nurse" }).getByRole("link", { name: "Timesheets" }).click();
  await expect(page).toHaveURL(/\/nurse\/timesheets$/);
}

function card(page: Page, label: string) {
  return page
    .getByRole("region", { name: "Summary" })
    .getByText(label, { exact: true })
    .locator("xpath=following-sibling::p[1]");
}

const shiftHours = (page: Page) => page.getByRole("region", { name: "Shift hours" });

test.describe("the nurse timesheet", () => {
  test("Maria reaches it from the sidebar and sees her seeded assignment", async ({ page }) => {
    await openTimesheets(page, "maria.lopez@example.com");

    await expect(page.getByRole("heading", { name: "Your shifts. Your hours." })).toBeVisible();
    await expect(page.getByRole("link", { name: "Timesheets" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByTestId("timesheet-table")).toHaveCount(1);

    const row = page.getByTestId("timesheet-table").getByRole("row", { name: /Oct 3, 2026/ });
    await expect(row).toContainText("LPN");
    await expect(row).toContainText("Assigned");
    await expect(row).toContainText("Sunrise Health Staffing");
    await expect(row).toContainText("07:00–19:00");
    await expect(row).toContainText("12h");
    await expect(row).toContainText("Not recorded");

    await expect(card(page, "Recorded work hours")).toHaveText("—");
    await expect(page.getByText("No work hours recorded")).toBeVisible();
  });

  test("a nurse with no assignments sees the empty state, then a claim after Refresh", async ({
    page,
    request,
  }) => {
    const nurse = await createNurse({ expiresOn: "2099-12-31" });
    userIds.push(nurse.id);
    emails.push(nurse.email);

    await openTimesheets(page, nurse.email);
    await expect(shiftHours(page)).toContainText("You have no assigned shifts yet.");
    await expect(page.getByTestId("timesheet-table")).toHaveCount(0);
    await expect(card(page, "Assigned shifts")).toHaveText("0");
    await expect(card(page, "Scheduled hours")).toHaveText("0h");
    await expect(shiftHours(page)).toContainText("0 assigned shifts");
    await expect(shiftHours(page)).toContainText("Total scheduled: 0h");

    const posted = await request.post("/api/shifts", {
      headers: { Authorization: `Bearer ${await tokenFor(request, "admin@sunrisehealth.example")}` },
      data: { role: "RN", date: "2027-11-20", startTime: "19:00", endTime: "07:00" },
    });
    expect(posted.status()).toBe(201);
    const { id } = await posted.json();
    shiftIds.push(id);
    const claimed = await request.post(`/api/shifts/${id}/claim`, {
      headers: { Authorization: `Bearer ${await tokenFor(request, nurse.email)}` },
    });
    expect(claimed.status()).toBe(200);

    await page.getByRole("button", { name: "Refresh" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Timesheet refreshed." })).toHaveCount(1);
    const row = page.getByTestId("timesheet-table").getByRole("row", { name: /Nov 20, 2027/ });
    await expect(row).toContainText("RN");
    await expect(row).toContainText("19:00–07:00");
    await expect(row).toContainText("Ends Nov 21");
    await expect(row).toContainText("12h");
    await expect(card(page, "Assigned shifts")).toHaveText("1");
    await expect(card(page, "Scheduled hours")).toHaveText("12h");
    await expect(shiftHours(page)).toContainText("1 assigned shift");
    await expect(shiftHours(page)).toContainText("Total scheduled: 12h");
  });

  test("stacks into cards at 375px with no page-wide horizontal scroll", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await openTimesheets(page, "maria.lopez@example.com");

    await expect(page.getByTestId("timesheet-table").getByRole("row", { name: /Oct 3, 2026/ })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
