import { expect, test, type Page } from "@playwright/test";
import path from "path";
import { writeFile, mkdir } from "fs/promises";
import os from "os";

import { registerAndOnboard } from "./helpers";

async function setupProjectWithDataRoom(page: Page) {
  const email = `data-room-e2e-${Date.now()}@test.com`;
  const password = "E2ETestPass123";
  const orgName = `Data Room Org ${Date.now()}`;
  const workspaceName = `DR Workspace ${Date.now()}`;
  const projectName = `DR Project ${Date.now()}`;

  await registerAndOnboard(page, {
    name: "Data Room Owner",
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

  await page.getByRole("tab", { name: "Data Room" }).click();
  await expect(page.getByRole("heading", { name: "Data Room" })).toBeVisible({
    timeout: 10_000,
  });

  return { projectName, tmpDir: await mkdir(path.join(os.tmpdir(), `nexusiq-e2e-${Date.now()}`), { recursive: true }) };
}

test.describe("data room flow", () => {
  test("create project → open Data Room → upload PDF → appears as PENDING", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const { tmpDir } = await setupProjectWithDataRoom(page);
    await expect(page.getByText("Upload your first document")).toBeVisible();

    const pdfPath = path.join(tmpDir, "sample-diligence.pdf");
    await writeFile(
      pdfPath,
      Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n", "utf8"),
    );

    await page.getByRole("button", { name: /^upload$/i }).click();
    const dialog = page.getByRole("dialog", { name: /upload documents/i });
    await expect(dialog).toBeVisible();

    await dialog.locator('input[type="file"]').setInputFiles(pdfPath);

    await expect(page.getByText("sample-diligence.pdf")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("PENDING").first()).toBeVisible({ timeout: 15_000 });
  });

  test("shows completeness checklist and classification filter", async ({ page }) => {
    test.setTimeout(120_000);
    await setupProjectWithDataRoom(page);

    await expect(page.getByRole("region", { name: "Data room completeness" })).toBeVisible();
    await expect(page.getByLabel("Filter by classification")).toBeVisible();
    await expect(page.getByLabel("Filter by tag")).toBeVisible();
  });

  test("upload markdown file and open full preview", async ({ page }) => {
    test.setTimeout(120_000);
    const { tmpDir } = await setupProjectWithDataRoom(page);

    const mdPath = path.join(tmpDir, "README.md");
    await writeFile(mdPath, "# Board Minutes\n\n- Item one\n- Item two\n", "utf8");

    await page.getByRole("button", { name: /^upload$/i }).click();
    const dialog = page.getByRole("dialog", { name: /upload documents/i });
    await dialog.locator('input[type="file"]').setInputFiles(mdPath);

    await expect(page.getByText("README.md")).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: "README.md", exact: true }).click();
    await page.getByRole("button", { name: "Expand preview" }).click();
    const fullPreview = page.getByRole("dialog", { name: /README\.md/i });
    await expect(fullPreview).toBeVisible({
      timeout: 10_000,
    });
    await expect(fullPreview.getByRole("heading", { name: "Board Minutes" })).toBeVisible();
  });
});
