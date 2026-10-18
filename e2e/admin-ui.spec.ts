import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

import { accounts, deleteOwnRows, PASSWORD, sessionIdOf } from "./support";

const sessionIds: string[] = [];
const shiftIds: string[] = [];

test.afterAll(async () => {
  await deleteOwnRows({ sessionIds, shiftIds });
});

const agencyB = accounts[1].email;
const maria = accounts[2].email;
const alex = accounts[4].email;

async function signInAsAdmin(page: Page) {
  await page.goto("/login");
  await page.getByTestId("login-email-input").fill(alex);
  await page.getByTestId("login-password-input").fill(PASSWORD);
  await page.getByTestId("login-submit-button").click();
  await expect(page).toHaveURL(/\/admin$/);

  const cookies = await page.context().cookies();
  const session = cookies.find((cookie) => cookie.name === "shiftpatch_session");
  const sid = session ? sessionIdOf(session.value) : undefined;
  if (sid) sessionIds.push(sid);
}

async function tokenFor(request: APIRequestContext, email: string) {
  const response = await request.post("/api/auth/login", { data: { email, password: PASSWORD } });
  const body = await response.json();
  const sid = sessionIdOf(body.token);
  if (sid) sessionIds.push(sid);
  return body.token as string;
}

async function postShift(request: APIRequestContext, date: string): Promise<string> {
  const created = await request.post("/api/shifts", {
    headers: { Authorization: `Bearer ${await tokenFor(request, agencyB)}` },
    data: { role: "RN", date, startTime: "07:00", endTime: "19:00" },
  });
  expect(created.status()).toBe(201);
  const { id } = await created.json();
  shiftIds.push(id);
  return id;
}

function tabCount(page: Page, name: string) {
  return page.getByRole("tab", { name: new RegExp(`^${name} \\(\\d+\\)$`) });
}

async function countOf(page: Page, name: string): Promise<number> {
  const label = await tabCount(page, name).textContent();
  return Number(/\((\d+)\)/.exec(label ?? "")?.[1]);
}

async function expectTotalsAgree(page: Page) {
  const rows = page.getByTestId("admin-dashboard-shift-table").locator("tbody tr");
  const all = await countOf(page, "All shifts");
  await expect(rows).toHaveCount(all);
  await expect(page.getByText(`Showing ${all} ${all === 1 ? "shift" : "shifts"}`)).toBeVisible();

  const summary = page.getByRole("region", { name: "Summary" });
  await expect(summary.getByText("Open shifts").locator("xpath=following-sibling::p[1]")).toHaveText(
    String(await countOf(page, "Open")),
  );
  await expect(summary.getByText("Filled shifts").locator("xpath=following-sibling::p[1]")).toHaveText(
    String(await countOf(page, "Filled")),
  );
}

test.describe("the admin audit log", () => {
  test("opens from the sidebar and lists its events in one audit table", async ({ page }) => {
    await signInAsAdmin(page);
    await page
      .getByRole("navigation", { name: "Administration" })
      .getByRole("link", { name: "Audit log" })
      .click();

    await expect(page).toHaveURL(/\/admin\/audit$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "A clear record of every change." }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Audit log" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("link", { name: "Shift overview" })).not.toHaveAttribute(
      "aria-current",
      "page",
    );

    const table = page.getByTestId("audit-log-table");
    await expect(table).toHaveCount(1);
    const rows = await table.locator("tbody tr").count();
    expect(rows).toBeGreaterThan(0);
    await expect(page.getByText(`Showing ${rows} ${rows === 1 ? "event" : "events"}`)).toBeVisible();
  });

  test("stacks into cards at 375px with no page-wide horizontal scroll", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await signInAsAdmin(page);
    await page.goto("/admin/audit");

    await expect(page.getByTestId("audit-log-table")).toBeVisible();
    await expect(page.getByTestId("audit-log-table").locator("thead")).toBeHidden();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe("the admin shift overview", () => {
  test("lists the seeded shifts with agency, nurse and one status badge each", async ({ page }) => {
    await signInAsAdmin(page);

    await expect(page.getByRole("heading", { level: 1, name: "Every shift, in view." })).toBeVisible();
    await expect(page.getByRole("link", { name: "Shift overview" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(page.getByTestId("signed-in-user")).toContainText("Alex Kim");
    await expect(page.getByTestId("admin-dashboard-shift-table")).toHaveCount(1);

    const open = page.getByRole("row", { name: /Oct 2, 2026/ });
    await expect(open).toContainText("Sunrise Health Staffing");
    await expect(open).toContainText("19:00–07:00 (+1 day)");
    await expect(open).toContainText("Unassigned");
    await expect(open.getByTestId("admin-shift-status-badge")).toHaveText("Open");

    const filled = page.getByRole("row", { name: /Oct 3, 2026/ });
    await expect(filled).toContainText("Sunrise Health Staffing");
    await expect(filled).toContainText("Maria Lopez");
    await expect(filled.getByTestId("admin-shift-status-badge")).toHaveText("Filled");

    const metro = page.getByRole("row", { name: /Oct 4, 2026/ });
    await expect(metro).toContainText("Metro Care Partners");
    await expect(metro).toContainText("Unassigned");
    await expect(metro.getByTestId("admin-shift-status-badge")).toHaveText("Open");

    const rows = page.getByTestId("admin-dashboard-shift-table").locator("tbody tr");
    await expect(page.getByTestId("admin-shift-status-badge")).toHaveCount(await rows.count());
  });

  test("the cards, tab counts and footer agree, and keep agreeing per agency and tab", async ({
    page,
  }) => {
    await signInAsAdmin(page);
    await expectTotalsAgree(page);

    await page.getByRole("tab", { name: /^Open \(/ }).click();
    const openRows = page.getByTestId("admin-dashboard-shift-table").locator("tbody tr");
    await expect(openRows).toHaveCount(await countOf(page, "Open"));
    await expect(page.getByTestId("admin-shift-status-badge").first()).toHaveText("Open");

    await page.getByRole("tab", { name: /^All shifts \(/ }).click();
    await page.getByLabel("Agency").selectOption({ label: "Metro Care Partners" });
    await expectTotalsAgree(page);
  });

  test("the agency filter narrows the rows, and Clear filters resets it", async ({ page }) => {
    await signInAsAdmin(page);

    await page.getByLabel("Agency").selectOption({ label: "Metro Care Partners" });
    await expect(page.getByRole("row", { name: /Oct 4, 2026/ })).toBeVisible();
    await expect(page.getByRole("row", { name: /Oct 2, 2026/ })).toHaveCount(0);
    await expect(page.getByRole("row", { name: /Oct 3, 2026/ })).toHaveCount(0);
    const agencyCells = page
      .getByTestId("admin-dashboard-shift-table")
      .locator("tbody tr td:nth-child(2)");
    for (const text of await agencyCells.allTextContents()) {
      expect(text).toBe("Metro Care Partners");
    }

    await page.getByRole("tab", { name: /^Filled \(/ }).click();
    if ((await countOf(page, "Filled")) === 0) {
      await expect(page.getByText("No shifts match these filters.")).toBeVisible();
      await page.getByRole("button", { name: "Clear filters" }).click();
      await expect(page.getByRole("row", { name: /Oct 2, 2026/ })).toBeVisible();
      await expect(page.getByLabel("Agency")).toHaveValue("all");
      await expect(page.getByRole("tab", { name: /^All shifts \(/ })).toHaveAttribute(
        "aria-selected",
        "true",
      );
    }
  });

  test("stacks into cards at 375px with no page-wide horizontal scroll", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await signInAsAdmin(page);

    await expect(page.getByRole("row", { name: /Oct 2, 2026/ })).toBeVisible();
    await expect(page.getByTestId("admin-dashboard-shift-table")).toHaveCount(1);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("tabs move with the arrow keys", async ({ page }) => {
    await signInAsAdmin(page);

    await page.getByRole("tab", { name: /^All shifts \(/ }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("tab", { name: /^Open \(/ })).toBeFocused();
    await expect(page.getByRole("tab", { name: /^Open \(/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  test("Refresh picks up a posted shift and a claim, keeping the filter", async ({
    page,
    request,
  }) => {
    await signInAsAdmin(page);
    await page.getByLabel("Agency").selectOption({ label: "Metro Care Partners" });

    const id = await postShift(request, "2027-09-01");
    const row = page.getByRole("row", { name: /Sep 1, 2027/ });
    await expect(row).toHaveCount(0);

    await page.getByRole("button", { name: "Refresh" }).click();
    await expect(row).toBeVisible();
    await expect(row).toContainText(id);
    await expect(row).toContainText("Unassigned");
    await expect(row.getByTestId("admin-shift-status-badge")).toHaveText("Open");
    await expect(page.getByRole("status")).toHaveText("Shift overview refreshed.");
    await expect(page.getByLabel("Agency")).toHaveValue("agency-b");

    const claimed = await request.post(`/api/shifts/${id}/claim`, {
      headers: { Authorization: `Bearer ${await tokenFor(request, maria)}` },
    });
    expect(claimed.status()).toBe(200);
    await expect(row).toContainText("Unassigned");

    await page.getByRole("button", { name: "Refresh" }).click();
    await expect(row).toContainText("Maria Lopez");
    await expect(row.getByTestId("admin-shift-status-badge")).toHaveText("Filled");
  });

  test("returning to the tab refreshes without a click", async ({ page, request }) => {
    await signInAsAdmin(page);

    await postShift(request, "2027-09-02");
    const row = page.getByRole("row", { name: /Sep 2, 2027/ });
    await expect(row).toHaveCount(0);

    await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
    await expect(row).toBeVisible();
    await expect(page.getByRole("status")).toHaveText("");
  });
});
