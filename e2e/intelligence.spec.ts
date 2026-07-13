import { expect, test } from "@playwright/test";

import { registerAndOnboard } from "./helpers";

test.describe("intelligence agents", () => {
  test("runs a mocked financial scan and shows the score", async ({ page }) => {
    test.setTimeout(120_000);
    const timestamp = Date.now();
    const workspaceName = `Intel Workspace ${timestamp}`;
    const projectName = `Intel Project ${timestamp}`;

    await registerAndOnboard(page, {
      name: "Intel Owner",
      email: `intel-e2e-${timestamp}@test.com`,
      password: "E2ETestPass123",
      orgName: `Intel Org ${timestamp}`,
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

    await page.getByRole("tab", { name: "Intelligence" }).click();
    await expect(page.getByRole("heading", { name: "Intelligence Agents" })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Executive/i })).toBeDisabled();
    await expect(page.getByRole("tab", { name: /Consensus/i })).toBeDisabled();
    await expect(page.getByText(/No findings yet/i)).toBeVisible();

    await page.route("**/api/projects/*/agents/financial/run", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            runId: "run-e2e-financial",
            agentType: "FINANCIAL",
            status: "completed",
            score: 82,
            confidence: "HIGH",
            findings: [
              {
                id: "finding-e2e",
                category: "margin",
                title: "Margin pressure",
                description: "Operating margin compressed in Q4.",
                severity: "MEDIUM",
                sourceChunkId: "chunk-e2e",
                documentId: "doc-e2e",
              },
            ],
            citations: [
              {
                documentId: "doc-e2e",
                chunkId: "chunk-e2e",
                documentName: "Financials.pdf",
                excerpt: "Revenue grew 12% year over year.",
              },
            ],
            output: {
              financialHealthScore: 82,
              revenueAnalysis: "Revenue grew 12% year over year.",
              recommendation: "Continue monitoring margins.",
            },
          },
        }),
      });
    });

    await page.route("**/api/projects/*/agents/runs?limit=30", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: "run-e2e-financial",
              projectId: "project-e2e",
              agentType: "FINANCIAL",
              status: "COMPLETED",
              score: 82,
              confidence: "HIGH",
              startedAt: new Date().toISOString(),
              completedAt: new Date().toISOString(),
              error: null,
              findingCount: 1,
            },
          ],
        }),
      });
    });

    await page.route("**/api/agent-runs/run-e2e-financial", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            id: "run-e2e-financial",
            projectId: "project-e2e",
            agentType: "FINANCIAL",
            status: "COMPLETED",
            score: 82,
            confidence: "HIGH",
            startedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            error: null,
            findingCount: 1,
            output: {
              financialHealthScore: 82,
              revenueAnalysis: "Revenue grew 12% year over year.",
              recommendation: "Continue monitoring margins.",
            },
            citations: [
              {
                documentId: "doc-e2e",
                chunkId: "chunk-e2e",
                documentName: "Financials.pdf",
                excerpt: "Revenue grew 12% year over year.",
              },
            ],
            findings: [
              {
                id: "finding-e2e",
                projectId: "project-e2e",
                agentType: "FINANCIAL",
                agentRunId: "run-e2e-financial",
                category: "margin",
                title: "Margin pressure",
                description: "Operating margin compressed in Q4.",
                severity: "MEDIUM",
                score: null,
                sourceChunkId: "chunk-e2e",
                documentId: "doc-e2e",
                metadata: null,
                status: "OPEN",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            ],
          },
        }),
      });
    });

    await page.getByRole("button", { name: /run scan/i }).click();
    await expect(page.getByText("Financial scan completed.")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByLabel("Financial score: 82 out of 100")).toBeVisible();
    await expect(page.getByText("Margin pressure")).toBeVisible();
    await expect(page.getByRole("link", { name: "Financials.pdf" })).toBeVisible();

    // The project risk summary updates live from the completed run (one MEDIUM finding).
    await expect(page.getByText(/No findings yet/i)).toHaveCount(0);
    await expect(page.getByText("No critical or high-severity findings")).toBeVisible();
  });
});
