import { expect, test } from "@playwright/test";

import { registerAndOnboard } from "./helpers";

test.describe("search flow", () => {
  test("project search tab renders and global search redirects to project", async ({ page }) => {
    test.setTimeout(120_000);
    const email = `search-e2e-${Date.now()}@test.com`;
    const password = "E2ETestPass123";
    const orgName = `Search Org ${Date.now()}`;
    const workspaceName = `Search Workspace ${Date.now()}`;
    const projectName = `Search Project ${Date.now()}`;

    await registerAndOnboard(page, {
      name: "Search Owner",
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
    await page.getByRole("button", { name: /create project/i }).click();
    await page.getByLabel("Name").fill(projectName);
    await page.getByLabel("Type").selectOption("MA");
    await page.getByRole("button", { name: /^create project$/i }).click();
    await expect(page.getByRole("heading", { name: projectName })).toBeVisible({
      timeout: 15_000,
    });

    await page.getByRole("tab", { name: "Search" }).click();
    await expect(page).toHaveURL(/\/search/, { timeout: 10_000 });
    await expect(page.getByRole("heading", { name: "Smart Search" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Search", exact: true })).toBeVisible();
    await expect(page.getByText("Search your data room")).toBeVisible();

    await page.goto("/dashboard/search");
    await expect(page).toHaveURL(/\/dashboard\/projects\/[^/]+\/search/, { timeout: 10_000 });

    const projectSearchUrl = page.url();
    const projectId = projectSearchUrl.match(/\/projects\/([^/]+)\/search/)?.[1];
    expect(projectId).toBeTruthy();

    await page.goto(`/dashboard/projects/${projectId}/search?q=revenue&mode=keyword`);
    await expect(page).toHaveURL(/q=revenue/, { timeout: 10_000 });
    await expect(page).toHaveURL(/mode=keyword/);
    await expect(page.getByRole("button", { name: "Keyword", pressed: true })).toBeVisible();
  });
});
