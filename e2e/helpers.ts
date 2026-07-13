import { expect, type Locator, type Page } from "@playwright/test";

/** Radix / AppSelect combobox — options render in a portal, not as <select>. */
export async function selectComboboxOption(
  combobox: Locator,
  optionLabel: string | RegExp,
) {
  await combobox.click();
  await combobox.page().getByRole("option", { name: optionLabel }).click();
}

export async function registerAccount(
  page: Page,
  {
    name,
    email,
    password,
  }: {
    name: string;
    email: string;
    password: string;
  },
) {
  await page.goto("/register");
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password").fill(password);
  await page.locator('label[for="terms"]').click();
  await expect(page.locator("#terms")).toHaveAttribute("data-state", "checked");
  await page.getByRole("button", { name: /create account/i }).click();
  await expect(page).toHaveURL("/onboarding", { timeout: 30_000 });
}

export async function registerAndOnboard(
  page: Page,
  {
    name,
    email,
    password,
    orgName,
  }: {
    name: string;
    email: string;
    password: string;
    orgName: string;
  },
) {
  await registerAccount(page, { name, email, password });
  await page.getByLabel("Organization name").fill(orgName);
  await page.getByRole("button", { name: /^continue$/i }).click();
  await page.getByRole("button", { name: /skip for now/i }).click();
  await expect(page).toHaveURL("/dashboard", { timeout: 30_000 });
}

export async function signOutFromApp(page: Page) {
  await page.getByRole("button", { name: "User menu" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL("/login", { timeout: 15_000 });
}
