import { expect, test } from "@playwright/test";

import { registerAndOnboard } from "./helpers";

test.describe("reports & export", () => {
  test("shows reports page with generate menu and empty state", async ({ page }) => {
    test.setTimeout(120_000);
    const timestamp = Date.now();
    const workspaceName = `Reports Workspace ${timestamp}`;
    const projectName = `Reports Project ${timestamp}`;

    await registerAndOnboard(page, {
      name: "Reports Owner",
      email: `reports-e2e-${timestamp}@test.com`,
      password: "E2ETestPass123",
      orgName: `Reports Org ${timestamp}`,
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

    await page.getByRole("tab", { name: "Reports" }).click();
    await expect(page.getByRole("heading", { name: "Reports" })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: /Generate report/i }).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(/No reports yet/i)).toBeVisible({ timeout: 15_000 });
    // Intelligence banner is shown when no agent/consensus runs exist yet
    await expect(
      page.getByText(/Run intelligence first for richer reports|No reports yet/i).first(),
    ).toBeVisible();

    await page.route("**/api/projects/*/reports", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: {
              reports: [
                {
                  id: "report-e2e-1",
                  projectId: "proj",
                  userId: "user",
                  title: "Risk Register — Reports Project",
                  reportType: "RISK_REGISTER",
                  format: "MARKDOWN",
                  filePath: null,
                  formatsAvailable: ["md", "xlsx", "pdf"],
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                },
              ],
            },
          }),
        });
        return;
      }
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: {
              reportId: "report-e2e-1",
              title: "Risk Register — Reports Project",
              reportType: "RISK_REGISTER",
              contentPreview: "| HIGH | Ops |",
              status: "completed",
              createdAt: new Date().toISOString(),
              insufficientContext: true,
            },
          }),
        });
        return;
      }
      await route.continue();
    });

    await page.route("**/api/reports/report-e2e-1", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            report: {
              id: "report-e2e-1",
              projectId: "proj",
              userId: "user",
              title: "Risk Register — Reports Project",
              reportType: "RISK_REGISTER",
              format: "MARKDOWN",
              filePath: null,
              formatsAvailable: ["md", "xlsx", "pdf"],
              content: "# Risk Register\n\n| HIGH | Ops | RISK | Key person | — | OPEN |",
              metadata: { citations: [], sourceAgentRunIds: [], consensusRunId: null },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          },
        }),
      });
    });

    await page.getByRole("button", { name: /Generate report/i }).first().click();
    await page.getByRole("menuitem", { name: /Risk Register/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("heading", { name: /Generate Risk Register/i })).toBeVisible();
    await page.getByRole("button", { name: /^Generate$/i }).click();
    await expect(page.getByText(/Risk Register — Reports Project/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });
});
