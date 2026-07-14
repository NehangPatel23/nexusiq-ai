import { expect, test } from "@playwright/test";

import { registerAndOnboard } from "./helpers";

test.describe("Slice 15 History + Settings", () => {
  test("settings shell tabs and history page load", async ({ page }) => {
    const stamp = Date.now();
    await registerAndOnboard(page, {
      name: "Settings User",
      email: `e2e-settings-${stamp}@test.com`,
      password: "TestPass123",
      orgName: `Settings Org ${stamp}`,
    });

    await page.goto("/dashboard/settings");
    await expect(page).toHaveURL(/\/dashboard\/settings\/profile/);
    await expect(page.getByRole("navigation", { name: "Settings sections" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Security" })).toBeVisible();
    await expect(page.getByRole("link", { name: "AI Models" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Shortcuts" })).toBeVisible();

    await page.getByRole("link", { name: "AI Models" }).click();
    await expect(page).toHaveURL(/\/dashboard\/settings\/ai/);
    await expect(page.getByRole("button", { name: /Test connection/i })).toBeVisible();

    await page.getByRole("link", { name: "Shortcuts" }).click();
    await expect(page.getByText("Keyboard shortcuts")).toBeVisible();

    await page.goto("/dashboard/history");
    await expect(page.getByRole("heading", { name: "History" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Audit log" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Compare projects" })).toBeVisible();
  });
});
