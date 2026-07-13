import { expect, test } from "@playwright/test";

import { registerAndOnboard, selectComboboxOption } from "./helpers";

test.describe("projects flow", () => {
  test("create workspace → create project → appears in list → open overview tab", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const email = `project-e2e-${Date.now()}@test.com`;
    const password = "E2ETestPass123";
    const orgName = `Project Org ${Date.now()}`;
    const workspaceName = `Diligence Workspace ${Date.now()}`;
    const projectName = `Acme Acquisition ${Date.now()}`;

    await registerAndOnboard(page, {
      name: "Project Owner",
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

    await page.goto("/dashboard/projects");
    await expect(page.getByRole("heading", { name: "Projects", exact: true })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText("No projects yet")).toBeVisible();

    await page.getByRole("button", { name: /create project/i }).click();
    await page.getByLabel("Name").fill(projectName);
    await page.getByLabel("Target company (optional)").fill("Acme Corporation");
    await page.getByRole("button", { name: /^create project$/i }).click();

    await expect(page.getByRole("heading", { name: projectName })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("Deal metadata")).toBeVisible();
    await expect(page.getByRole("tab", { name: "Overview", selected: true })).toBeVisible();

    await page.goto("/dashboard/projects");
    await expect(page.getByText(projectName)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Acme Corporation")).toBeVisible();
  });

  test("view projects from workspace card filters projects list", async ({ page }) => {
    test.setTimeout(120_000);
    const email = `workspace-filter-${Date.now()}@test.com`;
    const password = "E2ETestPass123";
    const orgName = `Filter Org ${Date.now()}`;
    const workspaceA = `Alpha Workspace ${Date.now()}`;
    const workspaceB = `Beta Workspace ${Date.now()}`;
    const projectA = `Alpha Project ${Date.now()}`;
    const projectB = `Beta Project ${Date.now()}`;

    await registerAndOnboard(page, {
      name: "Filter Owner",
      email,
      password,
      orgName,
    });

    await page.goto("/dashboard/organizations");
    await page.getByRole("link", { name: /workspaces/i }).first().click();

    for (const workspaceName of [workspaceA, workspaceB]) {
      await page.getByRole("button", { name: /new workspace|create workspace/i }).first().click();
      await page.getByLabel("Name").fill(workspaceName);
      await page.getByRole("button", { name: /^create workspace$/i }).click();
      await expect(page.getByText(workspaceName)).toBeVisible({ timeout: 10_000 });
    }

    await page.goto("/dashboard/projects");
    await page.getByRole("button", { name: /new project|create project/i }).first().click();
    const createDialog = page.getByRole("dialog", { name: /create project/i });
    await createDialog.getByLabel("Name").fill(projectA);
    await selectComboboxOption(
      createDialog.getByLabel("Workspace", { exact: true }),
      `${workspaceA} (${orgName})`,
    );
    await createDialog.getByRole("button", { name: /^create project$/i }).click();
    await expect(page.getByRole("heading", { name: projectA })).toBeVisible({ timeout: 15_000 });

    await page.goto("/dashboard/projects");
    await page.getByRole("button", { name: /new project/i }).click();
    const secondCreateDialog = page.getByRole("dialog", { name: /create project/i });
    await secondCreateDialog.getByLabel("Name").fill(projectB);
    await selectComboboxOption(
      secondCreateDialog.getByLabel("Workspace", { exact: true }),
      `${workspaceB} (${orgName})`,
    );
    await secondCreateDialog.getByRole("button", { name: /^create project$/i }).click();
    await expect(page.getByRole("heading", { name: projectB })).toBeVisible({ timeout: 15_000 });

    await page.goto("/dashboard/organizations");
    await page.getByRole("link", { name: /workspaces/i }).first().click();
    const workspaceCard = page.locator("li").filter({ hasText: workspaceA });
    await workspaceCard.getByRole("link", { name: /view projects/i }).click();

    await expect(page).toHaveURL(/\/dashboard\/projects\?workspace=/, { timeout: 10_000 });
    await expect(page.getByText(`Showing projects in ${workspaceA}`)).toBeVisible();
    await expect(page.getByText(projectA)).toBeVisible();
    await expect(page.getByText(projectB)).not.toBeVisible();
  });
});
