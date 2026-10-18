import { expect, test, type Page } from "@playwright/test";

import { deleteOwnRows, PASSWORD, sessionIdOf } from "./support";

const sessionIds: string[] = [];

test.afterAll(async () => {
  await deleteOwnRows({ sessionIds });
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

async function openCredentials(page: Page, email: string) {
  await signIn(page, email);
  await page.getByRole("navigation", { name: "Nurse" }).getByRole("link", { name: "Credentials" }).click();
  await expect(page).toHaveURL(/\/nurse\/credentials$/);
}

const current = (page: Page) => page.getByRole("region", { name: "Current credential" });
// Next.js keeps the marketplace mounted but hidden after navigating away, banner included.
const credentialStatus = (page: Page) => page.getByTestId("credential-status").filter({ visible: true });

function pdf(name = "license.pdf", size = 2048) {
  return { name, mimeType: "application/pdf", buffer: Buffer.alloc(size) };
}

test.describe("the nurse credentials page", () => {
  test("Maria reaches it from the sidebar and sees her valid credential", async ({ page }) => {
    await openCredentials(page, "maria.lopez@example.com");

    await expect(page.getByRole("heading", { name: "Keep your credentials current." })).toBeVisible();
    await expect(page.getByRole("link", { name: "Credentials" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("link", { name: "Shift marketplace" })).not.toHaveAttribute(
      "aria-current",
      "page",
    );

    const status = credentialStatus(page);
    await expect(status).toHaveAttribute("data-state", "valid");
    await expect(status).toContainText("Expires Jan 1, 2027");
    await expect(current(page)).toContainText("Valid");
    await expect(current(page)).toContainText("Jan 1, 2027");
    await expect(current(page)).toContainText("No document uploaded");

    await expect(page.getByTestId("credential-upload-input")).toHaveAttribute("type", "file");
    await expect(page.getByLabel("Credential document")).toHaveAttribute(
      "data-testid",
      "credential-upload-input",
    );
    await expect(page.getByLabel("Expiry date")).toHaveAttribute(
      "data-testid",
      "credential-expiry-date-input",
    );
  });

  test("James sees his expired credential", async ({ page }) => {
    await openCredentials(page, "james.cook@example.com");

    await expect(credentialStatus(page)).toHaveAttribute("data-state", "expired");
    await expect(current(page)).toContainText("Expired");
    await expect(current(page)).toContainText("Jun 1, 2026");
  });

  test("validates the file and the date before sending anything", async ({ page }) => {
    let requests = 0;
    await page.route("**/api/credentials", (route) => {
      requests += 1;
      return route.abort();
    });
    await openCredentials(page, "maria.lopez@example.com");
    const save = page.getByRole("button", { name: "Save credential" });

    await save.click();
    await expect(page.getByText("Choose your credential document.")).toBeVisible();
    await expect(page.getByText("Enter the expiry date printed on your document.")).toBeVisible();
    await expect(page.getByTestId("credential-upload-input")).toBeFocused();

    const input = page.getByTestId("credential-upload-input");
    await input.setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("hi") });
    await expect(page.getByText("Choose a PDF, JPG or PNG file.")).toBeVisible();

    await input.setInputFiles(pdf("scan.pdf", 4 * 1024 * 1024 + 1));
    await expect(page.getByText("Choose a file of 4 MB or less.")).toBeVisible();

    await input.setInputFiles(pdf());
    await expect(page.getByText("license.pdf")).toBeVisible();
    await expect(page.getByText("Choose a different file")).toBeVisible();
    await expect(page.getByText("Choose a file of 4 MB or less.")).toHaveCount(0);

    await save.click();
    await expect(page.getByTestId("credential-expiry-date-input")).toBeFocused();
    await expect(page.getByTestId("notification-banner")).toHaveCount(0);
    expect(requests).toBe(0);
  });

  test("a failed save shows the server's message and keeps the input", async ({ page }) => {
    let release: () => void = () => {};
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    let body = "";
    await page.route("**/api/credentials", async (route) => {
      body = route.request().postData() ?? "";
      await held;
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ error: "That file could not be read. Choose another file." }),
      });
    });
    await openCredentials(page, "maria.lopez@example.com");

    await page.getByTestId("credential-upload-input").setInputFiles(pdf());
    await page.getByTestId("credential-expiry-date-input").fill("2028-03-31");
    await page.getByRole("button", { name: "Save credential" }).click();

    await expect(page.getByRole("button", { name: "Saving…" })).toBeDisabled();
    await expect(page.getByTestId("credential-expiry-date-input")).toBeDisabled();
    release();

    const banner = page.getByTestId("notification-banner");
    await expect(banner).toHaveText(/That file could not be read\. Choose another file\./);
    await expect(banner).toHaveAttribute("role", "alert");
    expect(body).toContain('name="file"; filename="license.pdf"');
    expect(body).toContain('name="expiresOn"');
    expect(body).toContain("2028-03-31");

    await expect(page.getByTestId("credential-expiry-date-input")).toHaveValue("2028-03-31");
    await expect(page.getByText("license.pdf")).toBeVisible();
    await expect(page.getByRole("button", { name: "Save credential" })).toBeEnabled();
    await expect(credentialStatus(page)).toHaveAttribute("data-state", "valid");
  });
});
