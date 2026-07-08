import { defineConfig, devices } from "@playwright/test";

const LOCAL_DATABASE_URL =
  "postgresql://nexusiq:nexusiq@localhost:5433/nexusiq?schema=public";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 1,
  reporter: "html",
  globalTeardown: "./e2e/global-teardown.ts",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      NODE_ENV: "development",
      // Never run e2e against Supabase — tests create @test.com users every run.
      DATABASE_URL: LOCAL_DATABASE_URL,
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    },
  },
});
