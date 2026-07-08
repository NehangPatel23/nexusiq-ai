import { expect, test } from "@playwright/test";

import { registerAccount, signOutFromApp } from "./helpers";

test.describe("auth flow", () => {
  test("register → login → dashboard → logout", async ({ page }) => {
    const email = `e2e-${Date.now()}@test.com`;
    const password = "E2ETestPass123";
    const name = "E2E User";

    await registerAccount(page, { name, email, password });
    await page.getByRole("button", { name: /skip for now/i }).click();
    await expect(page).toHaveURL("/dashboard", { timeout: 15_000 });
    await expect(page.getByText("Intelligence workspace")).toBeVisible();

    await signOutFromApp(page);

    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: /^sign in$/i }).click();

    await expect(page).toHaveURL("/dashboard", { timeout: 15_000 });
    await expect(page.getByText("Intelligence workspace")).toBeVisible();
  });

  test("redirects unauthenticated users from dashboard to login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("forgot password shows generic success message", async ({ page }) => {
    await page.goto("/forgot-password");
    await page.getByLabel("Email").fill("anyone@example.com");
    await page.getByRole("button", { name: /send reset link/i }).click();
    await expect(page.getByRole("heading", { name: /check your email/i })).toBeVisible();
  });

  test("password reset flow works in development", async ({ page }) => {
    const email = `reset-${Date.now()}@test.com`;
    const password = "InitialPass123";
    const newPassword = "UpdatedPass456";
    const name = "Reset User";

    await registerAccount(page, { name, email, password });
    await page.getByRole("button", { name: /skip for now/i }).click();
    await expect(page).toHaveURL("/dashboard", { timeout: 15_000 });

    await signOutFromApp(page);

    await page.goto("/forgot-password");
    await page.getByLabel("Email").fill(email);
    await page.getByRole("button", { name: /send reset link/i }).click();
    await expect(page.getByText(/development mode/i)).toBeVisible();

    const resetLink = page.locator('a[href*="reset-password?token="]');
    await expect(resetLink).toBeVisible();
    const resetUrl = await resetLink.getAttribute("href");
    await page.goto(resetUrl!);

    await page.getByLabel("New password").fill(newPassword);
    await page.getByLabel("Confirm password").fill(newPassword);
    await page.getByRole("button", { name: /update password/i }).click();
    await expect(page.getByRole("heading", { name: /password updated/i })).toBeVisible();

    await page.getByRole("link", { name: /^sign in$/i }).click();
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(newPassword);
    await page.getByRole("button", { name: /^sign in$/i }).click();
    await expect(page).toHaveURL("/dashboard", { timeout: 15_000 });
  });
});
