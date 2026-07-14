import { expect, test } from "@playwright/test";

import { registerAndOnboard } from "./helpers";

test.describe("Slice 16 Admin", () => {
  test("owner can open admin health and usage panels", async ({ page }) => {
    const stamp = Date.now();
    await registerAndOnboard(page, {
      name: "Admin E2E",
      email: `e2e-admin-${stamp}@test.com`,
      password: "TestPass123",
      orgName: `Admin Org ${stamp}`,
    });

    await expect(page.getByRole("link", { name: "Admin" })).toBeVisible();
    await page.goto("/dashboard/admin");
    await expect(page.getByRole("heading", { name: "Admin" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "System health" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Usage" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Reindex FTS" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Re-embed all" })).toBeVisible();
  });
});
