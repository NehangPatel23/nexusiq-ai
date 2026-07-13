import { expect, test } from "@playwright/test";

import { registerAndOnboard } from "./helpers";

async function createIntelProject(page: import("@playwright/test").Page, timestamp: number) {
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
  await expect(page.getByRole("heading", { name: "Intelligence Agents" })).toBeVisible({
    timeout: 30_000,
  });

  return { projectName, intelligenceUrl: page.url() };
}

test.describe("intelligence agents", () => {
  test("runs a mocked financial scan and shows the score", async ({ page }) => {
    test.setTimeout(120_000);
    const timestamp = Date.now();
    await createIntelProject(page, timestamp);

    await expect(page.getByRole("tab", { name: /Executive/i })).toBeEnabled();
    await expect(page.getByRole("tab", { name: /Consensus/i })).toBeEnabled();
    await expect(page.getByRole("button", { name: /Full analysis/i })).toBeVisible();
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

    await expect(page.getByText(/No findings yet/i)).toHaveCount(0);
    await expect(page.getByText("No critical or high-severity findings")).toBeVisible();
  });

  test("shows consensus opinions before the final recommendation", async ({ page }) => {
    test.setTimeout(120_000);
    const timestamp = Date.now() + 1;
    const { intelligenceUrl } = await createIntelProject(page, timestamp);

    const consensusDetail = {
      id: "consensus-e2e-1",
      projectId: "project-e2e",
      agentRunIds: ["run-1", "run-2", "run-3"],
      finalRecommendation: "Further Diligence on customer concentration",
      decisionConfidence: "MEDIUM" as const,
      agreements: [
        {
          topic: "Revenue quality",
          agents: ["FINANCIAL", "COMPLIANCE"],
          summary: "ARR growth is credible",
        },
      ],
      conflicts: [
        {
          topic: "Legal exposure",
          positions: [
            { agent: "LEGAL", position: "Elevated litigation risk" },
            { agent: "FINANCIAL", position: "Acceptable for deal size" },
          ],
          severity: "HIGH",
        },
      ],
      resolutionRationale: "Financial strength outweighs legal friction if indemnities are added.",
      agentOpinions: [
        {
          agent: "FINANCIAL",
          score: 72,
          recommendation: "Proceed with caution",
          confidence: "HIGH",
        },
        {
          agent: "LEGAL",
          score: 48,
          recommendation: "Resolve MSA risks first",
          confidence: "MEDIUM",
        },
        {
          agent: "COMPLIANCE",
          score: 61,
          recommendation: "Close GDPR gaps",
          confidence: "MEDIUM",
        },
      ],
      citations: [
        {
          documentId: "doc-e2e",
          chunkId: "chunk-e2e",
          documentName: "Board memo.pdf",
          excerpt: "Top 10 customers are 41% of ARR",
        },
      ],
      triggeredById: null,
      createdAt: new Date().toISOString(),
    };

    await page.route("**/api/consensus-runs/consensus-e2e-1", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: consensusDetail }),
      });
    });

    await page.route("**/api/projects/*/agents/consensus/runs?limit=20", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: consensusDetail.id,
              projectId: consensusDetail.projectId,
              decisionConfidence: consensusDetail.decisionConfidence,
              finalRecommendation: consensusDetail.finalRecommendation,
              agentRunIds: consensusDetail.agentRunIds,
              createdAt: consensusDetail.createdAt,
            },
          ],
        }),
      });
    });

    const base = intelligenceUrl.split("?")[0];
    await page.goto(`${base}?tab=consensus&consensus=consensus-e2e-1`);
    await expect(page.getByRole("heading", { name: "Intelligence Agents" })).toBeVisible({
      timeout: 30_000,
    });

    await expect(page.getByText("Agent opinions")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Proceed with caution")).toBeVisible();
    await expect(page.getByText("Resolve MSA risks first")).toBeVisible();
    // Opinions appear before the final recommendation card in the DOM.
    const opinions = page.getByText("Agent opinions");
    const finalRec = page.getByText("Further Diligence on customer concentration");
    await expect(finalRec).toBeVisible();
    const opinionsBox = await opinions.boundingBox();
    const finalBox = await finalRec.boundingBox();
    expect(opinionsBox && finalBox && opinionsBox.y < finalBox.y).toBeTruthy();
    await expect(page.getByText("Why this recommendation")).toBeVisible();
    await expect(
      page.getByText("Financial strength outweighs legal friction if indemnities are added."),
    ).toBeVisible();
  });

  test("renders executive markdown report with specialist context", async ({ page }) => {
    test.setTimeout(120_000);
    const timestamp = Date.now() + 2;
    await createIntelProject(page, timestamp);

    await page.route("**/api/projects/*/agents/executive/run", async (route) => {
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
            runId: "run-e2e-executive",
            agentType: "EXECUTIVE",
            status: "completed",
            score: 68,
            confidence: "MEDIUM",
            findings: [
              {
                id: "exec-finding-1",
                category: "Executive",
                title: "Priority action 1",
                description: "Request audited financials",
                severity: "HIGH",
                sourceChunkId: null,
                documentId: null,
              },
            ],
            citations: [
              {
                documentId: "doc-e2e",
                chunkId: "chunk-e2e",
                documentName: "Investment memo.pdf",
                excerpt: "ARR grew 18% YoY",
              },
            ],
            output: {
              executiveSummary: "Solid growth with manageable legal risk.",
              markdown:
                "## Executive Summary\n\nSolid growth with manageable legal risk.\n\n## Recommendation\n\nFurther Diligence\n\n## Priority Actions\n\n- Request audited financials",
              recommendation: "Further Diligence",
              confidence: "MEDIUM",
              specialistRunIds: ["run-fin", "run-legal"],
              specialistContext: [
                {
                  agentType: "FINANCIAL",
                  runId: "run-fin",
                  score: 74,
                  confidence: "HIGH",
                  recommendation: "Margins stable",
                },
                {
                  agentType: "LEGAL",
                  runId: "run-legal",
                  score: 51,
                  confidence: "MEDIUM",
                  recommendation: "Review MSA renewals",
                },
              ],
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
              id: "run-e2e-executive",
              projectId: "project-e2e",
              agentType: "EXECUTIVE",
              status: "COMPLETED",
              score: 68,
              confidence: "MEDIUM",
              startedAt: new Date().toISOString(),
              completedAt: new Date().toISOString(),
              error: null,
              findingCount: 1,
            },
          ],
        }),
      });
    });

    await page.route("**/api/agent-runs/run-e2e-executive", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            id: "run-e2e-executive",
            projectId: "project-e2e",
            agentType: "EXECUTIVE",
            status: "COMPLETED",
            score: 68,
            confidence: "MEDIUM",
            startedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            error: null,
            findingCount: 1,
            output: {
              executiveSummary: "Solid growth with manageable legal risk.",
              markdown:
                "## Executive Summary\n\nSolid growth with manageable legal risk.\n\n## Recommendation\n\nFurther Diligence\n\n## Priority Actions\n\n- Request audited financials",
              recommendation: "Further Diligence",
              confidence: "MEDIUM",
              specialistRunIds: ["run-fin", "run-legal"],
              specialistContext: [
                {
                  agentType: "FINANCIAL",
                  runId: "run-fin",
                  score: 74,
                  confidence: "HIGH",
                  recommendation: "Margins stable",
                },
                {
                  agentType: "LEGAL",
                  runId: "run-legal",
                  score: 51,
                  confidence: "MEDIUM",
                  recommendation: "Review MSA renewals",
                },
              ],
            },
            citations: [
              {
                documentId: "doc-e2e",
                chunkId: "chunk-e2e",
                documentName: "Investment memo.pdf",
                excerpt: "ARR grew 18% YoY",
              },
            ],
            findings: [
              {
                id: "exec-finding-1",
                projectId: "project-e2e",
                agentType: "EXECUTIVE",
                agentRunId: "run-e2e-executive",
                category: "Executive",
                title: "Priority action 1",
                description: "Request audited financials",
                severity: "HIGH",
                score: null,
                sourceChunkId: null,
                documentId: null,
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

    await page.getByRole("tab", { name: /Executive/i }).click();
    await page.getByRole("button", { name: /Run executive package/i }).click();
    await expect(page.getByText("Executive scan completed.")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Specialist context included")).toBeVisible();
    await expect(page.getByText("Margins stable")).toBeVisible();
    await expect(page.getByText("Solid growth with manageable legal risk.")).toBeVisible();
    await expect(page.getByRole("navigation", { name: /Executive report sections/i })).toBeVisible();
    await expect(page.getByRole("table").getByText("Request audited financials")).toBeVisible();
  });

  test("shows failed scan error instead of blank completed results", async ({ page }) => {
    test.setTimeout(120_000);
    const timestamp = Date.now() + 3;
    await createIntelProject(page, timestamp);

    await page.route("**/api/projects/*/agents/risk/run", async (route) => {
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
            runId: "run-e2e-risk-failed",
            agentType: "RISK",
            status: "failed",
            confidence: "INSUFFICIENT",
            findings: [],
            citations: [],
            output: null,
            error: "Agent output validation failed after retry: riskHeatmap.0.count: Required",
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
              id: "run-e2e-risk-failed",
              projectId: "project-e2e",
              agentType: "RISK",
              status: "FAILED",
              score: null,
              confidence: null,
              startedAt: new Date().toISOString(),
              completedAt: new Date().toISOString(),
              error: "Agent output validation failed after retry: riskHeatmap.0.count: Required",
              findingCount: 0,
            },
          ],
        }),
      });
    });

    await page.route("**/api/agent-runs/run-e2e-risk-failed", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            id: "run-e2e-risk-failed",
            projectId: "project-e2e",
            agentType: "RISK",
            status: "FAILED",
            score: null,
            confidence: null,
            startedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            error: "Agent output validation failed after retry: riskHeatmap.0.count: Required",
            findingCount: 0,
            output: null,
            citations: [],
            findings: [],
          },
        }),
      });
    });

    await page.getByRole("tab", { name: /^Risk$/i }).click();
    await page.getByRole("button", { name: /Run scan/i }).click();
    await expect(page.getByText(/Risk scan failed/i)).toBeVisible({ timeout: 10_000 });
    await expect(
      page.locator("#main-content").getByText(/riskHeatmap\.0\.count: Required/i),
    ).toBeVisible();
    await expect(page.getByText(/Last completed/i)).toHaveCount(0);
  });
});
