import { expect, test } from "@playwright/test";

async function registerAndOnboard(
  page: import("@playwright/test").Page,
  email: string,
  password: string,
  name: string,
  orgName: string,
) {
  await page.goto("/register");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password").fill(password);
  await page.locator("#terms").click();
  await page.getByRole("button", { name: /create account/i }).click();

  await expect(page).toHaveURL("/onboarding", { timeout: 15_000 });
  await page.getByLabel("Organization name").fill(orgName);
  await page.getByRole("button", { name: /create organization/i }).click();
  await expect(page).toHaveURL("/dashboard", { timeout: 15_000 });
}

test.describe("organizations flow", () => {
  test("create org → invite member → verify members list", async ({ browser }) => {
    test.setTimeout(120_000);
    const ownerEmail = `org-owner-e2e-${Date.now()}@test.com`;
    const inviteeEmail = `org-invitee-e2e-${Date.now()}@test.com`;
    const password = "E2ETestPass123";
    const ownerOrgName = `Owner Org ${Date.now()}`;
    const inviteeOrgName = `Invitee Org ${Date.now()}`;

    const ownerContext = await browser.newContext();
    const ownerPage = await ownerContext.newPage();
    const inviteeContext = await browser.newContext();
    const inviteePage = await inviteeContext.newPage();

    await registerAndOnboard(ownerPage, ownerEmail, password, "Org Owner", ownerOrgName);

    await registerAndOnboard(
      inviteePage,
      inviteeEmail,
      password,
      "Org Invitee",
      inviteeOrgName,
    );

    await ownerPage.goto("/dashboard/organizations");
    await ownerPage.getByRole("link", { name: /manage organization/i }).click();
    await expect(ownerPage.getByRole("heading", { name: ownerOrgName })).toBeVisible();

    await ownerPage.getByLabel("Email").fill(inviteeEmail);
    await ownerPage.getByRole("button", { name: /send invite/i }).click();
    await expect(ownerPage.getByText(inviteeEmail)).toBeVisible({ timeout: 10_000 });
    await expect(ownerPage.getByText("Pending", { exact: true })).toBeVisible();

    await inviteePage.getByRole("button", { name: /notifications/i }).click();
    await inviteePage.getByText(/invitation to/i).click();
    await expect(inviteePage.getByRole("heading", { name: /you're invited/i })).toBeVisible({
      timeout: 10_000,
    });
    await inviteePage.getByRole("button", { name: new RegExp(ownerOrgName, "i") }).click();
    await expect(inviteePage.getByRole("heading", { name: ownerOrgName })).toBeVisible({
      timeout: 10_000,
    });

    await ownerPage.reload();
    await expect(ownerPage.getByText(inviteeEmail)).toBeVisible();
    await expect(ownerPage.getByText("Pending", { exact: true })).toHaveCount(0);
    await expect(ownerPage.getByText("Org Invitee")).toBeVisible();

    await ownerContext.close();
    await inviteeContext.close();
  });

  test("invite before register shows notification after signup", async ({ browser }) => {
    test.setTimeout(120_000);
    const ownerEmail = `invite-first-owner-${Date.now()}@test.com`;
    const inviteeEmail = `invite-first-invitee-${Date.now()}@test.com`;
    const password = "E2ETestPass123";
    const ownerOrgName = `Invite First Org ${Date.now()}`;

    const ownerContext = await browser.newContext();
    const ownerPage = await ownerContext.newPage();
    const inviteeContext = await browser.newContext();
    const inviteePage = await inviteeContext.newPage();

    await registerAndOnboard(ownerPage, ownerEmail, password, "Owner", ownerOrgName);
    await ownerPage.goto("/dashboard/organizations");
    await ownerPage.getByRole("link", { name: /manage organization/i }).click();
    await ownerPage.getByLabel("Email").fill(inviteeEmail);
    await ownerPage.getByRole("button", { name: /send invite/i }).click();
    await expect(ownerPage.getByText(inviteeEmail)).toBeVisible({ timeout: 10_000 });

    await inviteePage.goto("/register");
    await inviteePage.waitForLoadState("networkidle");
    await inviteePage.getByLabel("Name").fill("Late Invitee");
    await inviteePage.getByLabel("Email").fill(inviteeEmail);
    await inviteePage.getByLabel("Password", { exact: true }).fill(password);
    await inviteePage.getByLabel("Confirm password").fill(password);
    await inviteePage.locator("#terms").click();
    await inviteePage.getByRole("button", { name: /create account/i }).click();
    await expect(inviteePage).toHaveURL("/onboarding", { timeout: 15_000 });
    await expect(inviteePage.getByText(/pending invitations/i)).toBeVisible();
    await expect(inviteePage.getByText(ownerOrgName)).toBeVisible();

    await ownerContext.close();
    await inviteeContext.close();
  });

  test("sidebar placeholder pages load without 404", async ({ page }) => {
    const email = `placeholder-${Date.now()}@test.com`;
    const password = "E2ETestPass123";

    await page.goto("/register");
    await page.waitForLoadState("networkidle");
    await page.getByLabel("Name").fill("Placeholder User");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByLabel("Confirm password").fill(password);
    await page.locator("#terms").click();
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page).toHaveURL("/onboarding", { timeout: 15_000 });
    await page.getByRole("button", { name: /skip for now/i }).click();
    await expect(page).toHaveURL("/dashboard", { timeout: 15_000 });

    await page.getByRole("link", { name: "Agents" }).click();
    await expect(page.getByText(/coming soon/i)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Intelligence Agents" })).toBeVisible();
  });
});
