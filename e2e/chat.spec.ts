import { expect, test } from "@playwright/test";

import { registerAndOnboard } from "./helpers";

test.describe("interactive chat", () => {
  test("creates a project chat and renders streamed citations", async ({ page }) => {
    test.setTimeout(120_000);
    const timestamp = Date.now();
    const workspaceName = `Chat Workspace ${timestamp}`;
    const projectName = `Chat Project ${timestamp}`;

    await registerAndOnboard(page, {
      name: "Chat Owner",
      email: `chat-e2e-${timestamp}@test.com`,
      password: "E2ETestPass123",
      orgName: `Chat Org ${timestamp}`,
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

    await page.getByRole("tab", { name: "Chat" }).click();
    await expect(page.getByRole("heading", { name: "Interactive Chat" })).toBeVisible();
    await expect(page.getByText("Ask your data room")).toBeVisible();

    await page.route("**/api/chats/*/messages", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body:
          'event: token\ndata: {"delta":"Supported answer."}\n\n' +
          'event: done\ndata: {"messageId":"assistant-e2e","citations":[{"documentId":"doc-e2e","chunkId":"chunk-e2e","documentName":"Evidence.pdf","excerpt":"Evidence excerpt"}],"confidence":"HIGH","content":"Supported answer.","retrievedChunks":[{"chunkId":"chunk-e2e","documentId":"doc-e2e","documentName":"Evidence.pdf","content":"Evidence excerpt","pageNumber":1,"sectionTitle":"Summary"}]}\n\n',
      });
    });

    await page.getByRole("button", { name: "Biggest legal risk?" }).click();
    await expect(page.getByText("Supported answer.")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByLabel("Answer confidence: high")).toBeVisible();
    await expect(page.getByRole("link", { name: "Evidence.pdf" }).first()).toBeVisible();
  });
});
