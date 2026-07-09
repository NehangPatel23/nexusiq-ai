import { expect, test } from "@playwright/test";

import { registerAndOnboard } from "./helpers";

test.describe("workspaces flow", () => {
  test("create org → create workspace → edit → list shows workspace", async ({ page }) => {
    test.setTimeout(120_000);
    const email = `workspace-e2e-${Date.now()}@test.com`;
    const password = "E2ETestPass123";
    const orgName = `Workspace Org ${Date.now()}`;
    const workspaceName = `Due Diligence ${Date.now()}`;
    const updatedName = `Acquisition Review ${Date.now()}`;

    await registerAndOnboard(page, {
      name: "Workspace Owner",
      email,
      password,
      orgName,
    });

    await page.goto("/dashboard/organizations");
    await page.getByRole("link", { name: /workspaces/i }).first().click();
    await expect(page.getByRole("heading", { name: "Workspaces", exact: true })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText("No workspaces yet")).toBeVisible();

    await page.getByRole("button", { name: /create workspace/i }).click();
    await page.getByLabel("Name").fill(workspaceName);
    await page.getByLabel("Description (optional)").fill("Primary diligence workspace");
    await page.getByRole("button", { name: /^create workspace$/i }).click();

    await expect(page.getByText(workspaceName)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Primary diligence workspace")).toBeVisible();

    await page.getByRole("button", { name: /^edit$/i }).click();
    await page.getByLabel("Name").fill(updatedName);
    await page.getByRole("button", { name: /save changes/i }).click();

    await expect(page.getByText(updatedName)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(workspaceName)).toHaveCount(0);
  });

  test("soft delete → deleted tab → restore workspace", async ({ page }) => {
    test.setTimeout(120_000);
    const email = `workspace-trash-e2e-${Date.now()}@test.com`;
    const password = "E2ETestPass123";
    const orgName = `Trash Org ${Date.now()}`;
    const workspaceName = `Trash Workspace ${Date.now()}`;

    await registerAndOnboard(page, {
      name: "Trash Owner",
      email,
      password,
      orgName,
    });

    await page.goto("/dashboard/organizations");
    await page.getByRole("link", { name: /workspaces/i }).first().click();
    await page.getByRole("button", { name: /create workspace/i }).click();
    await page.getByLabel("Name").fill(workspaceName);
    await page.getByRole("button", { name: /^create workspace$/i }).click();
    await expect(page.getByText(workspaceName)).toBeVisible({ timeout: 10_000 });

    await page.getByRole("button", { name: new RegExp(`Delete ${workspaceName}`, "i") }).click();
    await page.getByRole("button", { name: /delete workspace/i }).click();
    await expect(page.getByText("No workspaces yet")).toBeVisible({ timeout: 10_000 });

    await page.getByRole("tab", { name: /deleted/i }).click();
    await expect(page.getByText(workspaceName)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/deleted/i).first()).toBeVisible();

    await page.getByRole("button", { name: /^restore$/i }).click();
    await page.getByRole("button", { name: /restore workspace/i }).click();
    await page.getByRole("tab", { name: /active/i }).click();
    await expect(page.getByText(workspaceName)).toBeVisible({ timeout: 10_000 });
  });
});
