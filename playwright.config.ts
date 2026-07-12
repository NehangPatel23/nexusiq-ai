import { defineConfig, devices } from "@playwright/test";

const E2E_PORT = 3001;
const E2E_BASE_URL = `http://localhost:${E2E_PORT}`;
const LOCAL_DATABASE_URL =
  "postgresql://nexusiq:nexusiq@localhost:5433/nexusiq?schema=public";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "html",
  globalTeardown: "./e2e/global-teardown.ts",
  use: {
    baseURL: E2E_BASE_URL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `pnpm dev --port ${E2E_PORT}`,
    url: E2E_BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      NODE_ENV: "development",
      PORT: String(E2E_PORT),
      // Never run e2e against Supabase — tests create @test.com users every run.
      DATABASE_URL: LOCAL_DATABASE_URL,
      NEXT_PUBLIC_APP_URL: E2E_BASE_URL,
      ENABLE_INLINE_PROCESSING: "false",
    },
  },
});
