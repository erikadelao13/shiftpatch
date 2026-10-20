import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

import { deleteOwnRows, PASSWORD, sessionIdOf } from "./support";

const sessionIds: string[] = [];
const shiftIds: string[] = [];

test.afterAll(async () => {
  await deleteOwnRows({ sessionIds, shiftIds });
});

const maria = "maria.lopez@example.com";
const james = "james.cook@example.com";
const sunrise = "admin@sunrisehealth.example";
const alex = "alex.kim@example.com";

async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.getByTestId("login-email-input").fill(email);
  await page.getByTestId("login-password-input").fill(PASSWORD);
  await page.getByTestId("login-submit-button").click();
  await expect(page).not.toHaveURL(/\/login$/);

  const cookies = await page.context().cookies();
  const session = cookies.find((cookie) => cookie.name === "shiftpatch_session");
  const sid = session ? sessionIdOf(session.value) : undefined;
  if (sid) sessionIds.push(sid);
}

async function tokenFor(request: APIRequestContext, email: string) {
  const response = await request.post("/api/auth/login", { data: { email, password: PASSWORD } });
  const token = (await response.json()).token as string;
  const sid = sessionIdOf(token);
  if (sid) sessionIds.push(sid);
  return token;
}

const pages = [
  { email: sunrise, path: "/agency", gets: ["/api/agency/board"] },
  { email: sunrise, path: "/agency/timesheets", gets: ["/api/timesheets"] },
  { email: maria, path: "/nurse", gets: ["/api/nurse/marketplace", "/api/credentials"] },
  { email: maria, path: "/nurse/credentials", gets: ["/api/credentials"] },
  { email: maria, path: "/nurse/timesheets", gets: ["/api/timesheets"] },
  { email: alex, path: "/admin", gets: ["/api/admin/board"] },
  { email: alex, path: "/admin/audit", gets: ["/api/audit"] },
  { email: alex, path: "/admin/timesheets", gets: ["/api/timesheets"] },
];

test.describe("the first render comes from the server", () => {
  for (const { email, path, gets } of pages) {
    test(`${path} sends no request to its GET routes`, async ({ page }) => {
      await signIn(page, email);

      const requested: string[] = [];
      page.on("request", (request) => {
        const { pathname } = new URL(request.url());
        if (request.method() === "GET" && gets.includes(pathname)) requested.push(pathname);
      });

      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await page.waitForLoadState("networkidle");

      expect(requested).toEqual([]);
    });
  }
});

test("signing out clears the cache, so the next nurse in the same tab sees only their own data", async ({
  page,
}) => {
  await signIn(page, maria);
  await expect(page.getByTestId("credential-status")).toHaveAttribute("data-state", "valid");
  await expect(page.getByRole("region", { name: "My shifts" })).toContainText("Oct 3, 2026");

  await page.getByTestId("sign-out-button").click();
  await expect(page).toHaveURL(/\/login$/);

  await page.getByTestId("login-email-input").fill(james);
  await page.getByTestId("login-password-input").fill(PASSWORD);
  await page.getByTestId("login-submit-button").click();
  await expect(page).toHaveURL(/\/nurse$/);

  await expect(page.getByTestId("credential-status")).toHaveAttribute("data-state", "expired");
  await expect(page.getByRole("region", { name: "My shifts" })).not.toContainText("Oct 3, 2026");
  await expect(page.getByText("Maria Lopez")).toHaveCount(0);

  const cookies = await page.context().cookies();
  const session = cookies.find((cookie) => cookie.name === "shiftpatch_session");
  const sid = session ? sessionIdOf(session.value) : undefined;
  if (sid) sessionIds.push(sid);
});

test("an agency cancel shows on the Timesheets page after client navigation", async ({
  page,
  request,
}) => {
  const created = await request.post("/api/shifts", {
    headers: { Authorization: `Bearer ${await tokenFor(request, sunrise)}` },
    data: { role: "RN", date: "2027-11-21", startTime: "07:00", endTime: "19:00" },
  });
  const { id } = await created.json();
  shiftIds.push(id);
  const claimed = await request.post(`/api/shifts/${id}/claim`, {
    headers: { Authorization: `Bearer ${await tokenFor(request, maria)}` },
  });
  expect(claimed.status()).toBe(200);

  await signIn(page, sunrise);
  const nav = page.getByRole("navigation", { name: "Agency" });

  await nav.getByRole("link", { name: "Timesheets" }).click();
  await expect(page).toHaveURL(/\/agency\/timesheets$/);
  const entry = page.getByRole("row", { name: /Nov 21, 2027/ });
  await expect(entry).toBeVisible();
  await expect(entry).not.toContainText("Cancelled");

  await nav.getByRole("link", { name: "Overview" }).click();
  await page.getByRole("row", { name: /Nov 21, 2027/ }).getByTestId("shift-cancel-button").click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancel assignment" })
    .click();
  await expect(page.getByTestId("notification-banner")).toContainText("Assignment cancelled");

  await nav.getByRole("link", { name: "Timesheets" }).click();
  await expect(page).toHaveURL(/\/agency\/timesheets$/);
  await expect(page.getByRole("row", { name: /Nov 21, 2027/ })).toContainText("Cancelled");
});
