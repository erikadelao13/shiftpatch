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

async function signIn(page: Page, email: string, landing: RegExp = /\/nurse$/) {
  await page.goto("/login");
  await page.getByTestId("login-email-input").fill(email);
  await page.getByTestId("login-password-input").fill(PASSWORD);
  await page.getByTestId("login-submit-button").click();
  await expect(page).toHaveURL(landing);

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

    await expect(card(page, "Cancelled or no-show")).toBeVisible();
    await expect(page.getByText("Not counted in scheduled hours")).toBeVisible();
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

const AGENCY_A = "admin@sunrisehealth.example";
const AGENCY_B = "admin@metrocare.example";
const ADMIN = "alex.kim@example.com";

type History = { nurse: { id: string; email: string } };

async function createHistory(request: APIRequestContext, month: string): Promise<History> {
  const nurse = await createNurse({ expiresOn: "2099-12-31" });
  userIds.push(nurse.id);
  emails.push(nurse.email);
  const agencyToken = await tokenFor(request, AGENCY_A);
  const nurseToken = await tokenFor(request, nurse.email);
  const post = async (date: string) => {
    const response = await request.post("/api/shifts", {
      headers: { Authorization: `Bearer ${agencyToken}` },
      data: { role: "RN", date, startTime: "07:00", endTime: "19:00" },
    });
    expect(response.status()).toBe(201);
    const { id } = await response.json();
    shiftIds.push(id);
    return id as string;
  };
  const send = async (path: string, token: string, data?: unknown) => {
    const response = await request.post(path, { headers: { Authorization: `Bearer ${token}` }, data });
    expect(response.status()).toBe(200);
  };

  const shiftA = await post(`2035-${month}-01`);
  await send(`/api/shifts/${shiftA}/claim`, nurseToken);
  await send(`/api/shifts/${shiftA}/cancel`, nurseToken, { reason: "advance" });
  await send(`/api/shifts/${shiftA}/claim`, nurseToken);

  const shiftB = await post(`2035-${month}-02`);
  await send(`/api/shifts/${shiftB}/claim`, nurseToken);
  await send(`/api/shifts/${shiftB}/cancel`, agencyToken, { reason: "no-show" });

  return { nurse };
}

const tableRows = (page: Page) => page.getByTestId("timesheet-table").getByRole("row");
const rowOn = (page: Page, date: RegExp, pill: string) =>
  tableRows(page).filter({ hasText: date }).filter({ hasText: pill });

async function expectCardsAgreeWithRows(page: Page) {
  const assigned = await tableRows(page).filter({ hasText: "Assigned" }).count();
  const history = await tableRows(page).filter({ hasText: /Cancelled|No-show/ }).count();
  await expect(card(page, "Assigned shifts")).toHaveText(String(assigned));
  await expect(card(page, "Cancelled or no-show")).toHaveText(String(history));
}

test.describe("assignment history", () => {
  test("the nurse sees history rows that do not count toward the totals", async ({ page, request }) => {
    const { nurse } = await createHistory(request, "05");

    await openTimesheets(page, nurse.email);

    await expect(page.getByTestId("timesheet-table")).toHaveCount(1);
    await expect(tableRows(page)).toHaveCount(4);
    const cancelled = rowOn(page, /May 1, 2035/, "Cancelled");
    const assigned = rowOn(page, /May 1, 2035/, "Assigned");
    const noShow = rowOn(page, /May 2, 2035/, "No-show");
    await expect(cancelled).toContainText("Not counted");
    await expect(noShow).toContainText("Not counted");
    await expect(assigned).not.toContainText("Not counted");
    for (const row of [cancelled, assigned, noShow]) await expect(row).toContainText("Not recorded");

    await expect(card(page, "Assigned shifts")).toHaveText("1");
    await expect(card(page, "Scheduled hours")).toHaveText("12h");
    await expect(card(page, "Cancelled or no-show")).toHaveText("2");
    await expect(shiftHours(page)).toContainText("1 assigned shift");
    await expect(shiftHours(page)).toContainText("2 cancelled or no-show");
    await expect(shiftHours(page)).toContainText("Total scheduled: 12h");
  });

  test("an agency sees its own rows and the nurse, and another agency sees none", async ({
    page,
    request,
  }) => {
    await createHistory(request, "06");

    await signIn(page, AGENCY_A, /\/agency$/);
    const nav = page.getByRole("navigation", { name: "Agency" });
    await expect(nav.getByRole("link", { name: "Overview" })).toHaveAttribute("aria-current", "page");
    await nav.getByRole("link", { name: "Timesheets" }).click();
    await expect(page).toHaveURL(/\/agency\/timesheets$/);
    await expect(nav.getByRole("link", { name: "Timesheets" })).toHaveAttribute("aria-current", "page");
    await expect(nav.getByRole("link", { name: "Overview" })).not.toHaveAttribute("aria-current", "page");

    await expect(page.getByRole("heading", { name: "Every assignment, accounted for." })).toBeVisible();
    await expect(page.getByTestId("timesheet-table")).toHaveCount(1);
    for (const [date, pill] of [
      [/Jun 1, 2035/, "Cancelled"],
      [/Jun 1, 2035/, "Assigned"],
      [/Jun 2, 2035/, "No-show"],
    ] as const) {
      await expect(rowOn(page, date, pill)).toContainText("Throwaway Nurse");
    }
    await expectCardsAgreeWithRows(page);

    await page.context().clearCookies();
    await signIn(page, AGENCY_B, /\/agency$/);
    await page.goto("/agency/timesheets");
    await expect(page.getByRole("heading", { name: "Every assignment, accounted for." })).toBeVisible();
    await expect(page.getByText(/Jun [12], 2035/)).toHaveCount(0);
  });

  test("the admin sees every agency with Agency and Nurse columns", async ({ page, request }) => {
    await createHistory(request, "07");

    await signIn(page, ADMIN, /\/admin$/);
    const nav = page.getByRole("navigation", { name: "Administration" });
    await nav.getByRole("link", { name: "Timesheets" }).click();
    await expect(page).toHaveURL(/\/admin\/timesheets$/);
    await expect(nav.getByRole("link", { name: "Timesheets" })).toHaveAttribute("aria-current", "page");
    await expect(nav.getByRole("link", { name: "Shift overview" })).not.toHaveAttribute(
      "aria-current",
      "page",
    );

    await expect(page.getByRole("heading", { name: "Hours across every agency." })).toBeVisible();
    await expect(page.getByTestId("timesheet-table")).toHaveCount(1);
    await expect(page.getByRole("columnheader", { name: "Agency" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Nurse" })).toBeVisible();
    await expect(rowOn(page, /Jul 1, 2035/, "Assigned")).toContainText("Sunrise Health Staffing");
    await expect(rowOn(page, /Jul 2, 2035/, "No-show")).toContainText("Throwaway Nurse");
    await expectCardsAgreeWithRows(page);
  });

  test("a nurse is redirected away from the admin and agency timesheets", async ({ page }) => {
    await signIn(page, "maria.lopez@example.com");

    await page.goto("/admin/timesheets");
    await expect(page).toHaveURL(/\/nurse$/);
    await page.goto("/agency/timesheets");
    await expect(page).toHaveURL(/\/nurse$/);
  });

  test("the admin table fits at 375px and 1280px", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await signIn(page, ADMIN, /\/admin$/);
    await page.goto("/admin/timesheets");
    await expect(page.getByTestId("timesheet-table")).toHaveCount(1);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);

    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(page.getByRole("columnheader", { name: "Worked hours" })).toBeVisible();
    const widths = await page.evaluate(() => {
      const table = document.querySelector('[data-testid="timesheet-table"]');
      const panel = table?.closest("section");
      return { table: table?.scrollWidth ?? 0, panel: panel?.clientWidth ?? 0 };
    });
    expect(widths.table).toBeLessThanOrEqual(widths.panel);
  });
});
