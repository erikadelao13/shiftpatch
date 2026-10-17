import { randomUUID } from "node:crypto";

import { expect, test, type Page } from "@playwright/test";

import { accounts, deleteOwnRows, PASSWORD, sessionIdOf } from "./support";

const sessionIds: string[] = [];
const emails: string[] = [];

test.afterAll(async () => {
  await deleteOwnRows({ sessionIds, emails });
});

async function signIn(page: Page, email: string, password = PASSWORD) {
  await page.goto("/login");
  await page.getByTestId("login-email-input").fill(email);
  await page.getByTestId("login-password-input").fill(password);
  await page.getByTestId("login-submit-button").click();
}

async function trackSession(page: Page) {
  const cookies = await page.context().cookies();
  const session = cookies.find((cookie) => cookie.name === "shiftpatch_session");
  const sid = session ? sessionIdOf(session.value) : undefined;
  if (sid) sessionIds.push(sid);
}

for (const account of accounts) {
  test(`${account.email} lands on the ${account.role} workspace`, async ({ page }) => {
    await signIn(page, account.email);

    await expect(page).toHaveURL(new RegExp(`/${account.role}$`));
    const who = page.getByTestId("signed-in-user");
    await expect(who).toContainText(account.name);
    await expect(who).toContainText(
      { nurse: "Nurse", agency: "Agency", admin: "Administrator" }[account.role],
    );
    await trackSession(page);
  });
}

test("Maria signs in and lands on the nurse workspace", async ({ page }) => {
  await signIn(page, "maria.lopez@example.com");

  await expect(page).toHaveURL(/\/nurse$/);
  const who = page.getByTestId("signed-in-user");
  await expect(who).toContainText("Maria Lopez");
  await expect(who).toContainText("Nurse");
  await trackSession(page);
});

test("an agency user sees the agency name", async ({ page }) => {
  await signIn(page, "admin@metrocare.example");

  await expect(page).toHaveURL(/\/agency$/);
  const who = page.getByTestId("signed-in-user");
  await expect(who).toContainText("Metro Care Partners");
  await expect(who).toContainText("Agency");
  await trackSession(page);
});

test("an admin lands on the admin workspace", async ({ page }) => {
  await signIn(page, "alex.kim@example.com");

  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByTestId("signed-in-user")).toContainText("Alex Kim");
  await trackSession(page);
});

test("a wrong password shows the banner and keeps the email", async ({ page }) => {
  // James's failure row is cleared by his next successful sign-in.
  await signIn(page, "james.cook@example.com", "wrong-password");

  const banner = page.getByTestId("notification-banner");
  await expect(banner).toHaveText("Invalid email or password");
  await expect(banner).toHaveAttribute("role", "alert");
  await expect(page.getByTestId("login-email-input")).toHaveValue("james.cook@example.com");
  await expect(page.getByTestId("login-submit-button")).toBeEnabled();
  await expect(page).toHaveURL(/\/login$/);

  await page.getByTestId("login-password-input").fill(PASSWORD);
  await page.getByTestId("login-submit-button").click();
  await expect(page).toHaveURL(/\/nurse$/);
  await trackSession(page);
});

test("submit is disabled and says Signing in… while pending", async ({ page }) => {
  await page.route("**/login", async (route) => {
    if (route.request().method() === "POST") {
      await new Promise((resolve) => setTimeout(resolve, 800));
    }
    await route.continue();
  });

  const email = `e2e-${randomUUID()}@example.test`;
  emails.push(email);
  await signIn(page, email, "wrong-password");

  const button = page.getByTestId("login-submit-button");
  await expect(button).toBeDisabled();
  await expect(button).toHaveText("Signing in…");
  await expect(page.getByTestId("notification-banner")).toBeVisible();
  await expect(button).toBeEnabled();
});

test("the session cookie is HttpOnly and hidden from page scripts", async ({ page }) => {
  await signIn(page, "maria.lopez@example.com");
  await expect(page).toHaveURL(/\/nurse$/);

  const cookies = await page.context().cookies();
  const session = cookies.find((cookie) => cookie.name === "shiftpatch_session");
  expect(session?.httpOnly).toBe(true);
  expect(session?.sameSite).toBe("Lax");
  expect(await page.evaluate(() => document.cookie)).not.toContain("shiftpatch_session");
  await trackSession(page);
});

test("signed-out visits to every workspace go to /login", async ({ page }) => {
  for (const path of ["/nurse", "/agency", "/admin"]) {
    await page.goto(path);
    await expect(page, path).toHaveURL(/\/login$/);
  }
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
});

test("a wrong-role visit goes to the user's own workspace", async ({ page }) => {
  await signIn(page, "maria.lopez@example.com");
  await expect(page).toHaveURL(/\/nurse$/);

  await page.goto("/admin");
  await expect(page).toHaveURL(/\/nurse$/);
  await page.goto("/agency");
  await expect(page).toHaveURL(/\/nurse$/);
  await page.goto("/");
  await expect(page).toHaveURL(/\/nurse$/);
  await trackSession(page);
});

test("sign-out revokes the session; back lands on /login", async ({ page, request }) => {
  await signIn(page, "maria.lopez@example.com");
  await expect(page).toHaveURL(/\/nurse$/);
  const cookies = await page.context().cookies();
  const token = cookies.find((cookie) => cookie.name === "shiftpatch_session")!.value;
  await trackSession(page);

  await page.getByTestId("sign-out-button").click();
  await expect(page).toHaveURL(/\/login$/);

  await page.goBack();
  await expect(page).toHaveURL(/\/login$/);

  const response = await request.get("/api/auth/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(response.status()).toBe(401);
});

test("a revoked session that still has a valid signature does not loop", async ({ page, request, context }) => {
  await signIn(page, "alex.kim@example.com");
  await expect(page).toHaveURL(/\/admin$/);
  const cookies = await context.cookies();
  const token = cookies.find((cookie) => cookie.name === "shiftpatch_session")!.value;
  await trackSession(page);

  // Revoke on the server, keep the cookie in the browser.
  const logout = await request.post("/api/auth/logout", {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(logout.status()).toBe(204);

  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByTestId("login-submit-button")).toBeVisible();

  await page.goto("/login");
  await expect(page.getByTestId("login-submit-button")).toBeVisible();
  await page.waitForTimeout(500);
  await expect(page).toHaveURL(/\/login$/);
});

test("a signed-in user visiting /login is sent to their workspace", async ({ page }) => {
  await signIn(page, "maria.lopez@example.com");
  await expect(page).toHaveURL(/\/nurse$/);
  await trackSession(page);

  await page.goto("/login");

  await expect(page).toHaveURL(/\/nurse$/);
  await expect(page.getByTestId("signed-in-user")).toContainText("Maria Lopez");
});

test("the login form works with the keyboard alone", async ({ page }) => {
  await page.goto("/login");

  await page.getByTestId("login-email-input").focus();
  await page.keyboard.type("maria.lopez@example.com");
  await page.keyboard.press("Tab");
  await page.keyboard.type(PASSWORD);
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(/\/nurse$/);
  await trackSession(page);
});

test("the password visibility toggle changes the field type and its label", async ({ page }) => {
  await page.goto("/login");
  const field = page.getByTestId("login-password-input");

  await expect(field).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "Show password" }).click();
  await expect(field).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Hide password" }).click();
  await expect(field).toHaveAttribute("type", "password");
});
