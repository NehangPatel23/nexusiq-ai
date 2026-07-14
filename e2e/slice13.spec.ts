import { expect, test } from "@playwright/test";

import { registerAndOnboard } from "./helpers";

test.describe("contradictions, missing info, risks", () => {
  test("project tabs show empty/ready states for slice 13", async ({ page }) => {
    test.setTimeout(120_000);
    const timestamp = Date.now();
    const workspaceName = `Slice13 Workspace ${timestamp}`;
    const projectName = `Slice13 Project ${timestamp}`;

    await registerAndOnboard(page, {
      name: "Slice13 Owner",
      email: `slice13-e2e-${timestamp}@test.com`,
      password: "E2ETestPass123",
      orgName: `Slice13 Org ${timestamp}`,
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
    await page.getByRole("button", { name: /^create project$/i }).click();
    await expect(page.getByRole("heading", { name: projectName })).toBeVisible({
      timeout: 15_000,
    });

    await page.getByRole("tab", { name: "Risks" }).click();
    await expect(page.getByRole("heading", { name: "Risks" })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Run Intelligence agents first/i)).toBeVisible();

    await page.getByRole("tab", { name: "Contradictions" }).click();
    await expect(page.getByRole("heading", { name: "Contradictions" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(/Need at least two processed documents/i)).toBeVisible();

    await page.getByRole("tab", { name: /Missing/i }).click();
    await expect(page.getByRole("heading", { name: /Missing information/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole("button", { name: /Scan missing docs/i })).toBeVisible();
    await expect(page.getByText(/Expected vs found/i)).toBeVisible();
  });
});
