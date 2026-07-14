import { expect, test } from "@playwright/test";

import { registerAndOnboard } from "./helpers";

test.describe("simulator + action plan", () => {
  test("project tabs show simulator prerequisites and action plan empty state", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const timestamp = Date.now();
    const workspaceName = `Slice14 Workspace ${timestamp}`;
    const projectName = `Slice14 Project ${timestamp}`;

    await registerAndOnboard(page, {
      name: "Slice14 Owner",
      email: `slice14-e2e-${timestamp}@test.com`,
      password: "E2ETestPass123",
      orgName: `Slice14 Org ${timestamp}`,
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

    await page.getByRole("tab", { name: /Simulator/i }).click();
    await expect(page.getByRole("heading", { name: "Risk Simulator" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(/Need baseline agent runs|Prerequisites missing/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Run simulation/i })).toBeDisabled();

    await page.getByRole("tab", { name: /Actions/i }).click();
    await expect(page.getByRole("heading", { name: "Action Plan" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(/No action items yet/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /^Add task$/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Create first task/i })).toBeVisible();
  });
});
