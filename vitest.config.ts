import { defineConfig, configDefaults } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    exclude: [...configDefaults.exclude, "e2e/**"],
    env: {
      // Integration tests must not write to Supabase.
      DATABASE_URL:
        process.env.DATABASE_URL?.includes("localhost") ||
        process.env.DATABASE_URL?.includes("127.0.0.1")
          ? process.env.DATABASE_URL
          : "postgresql://nexusiq:nexusiq@localhost:5433/nexusiq?schema=public",
    },
  },
  resolve: {
    alias: [
      { find: "@/features", replacement: path.resolve(__dirname, "./features") },
      { find: "@", replacement: path.resolve(__dirname, "./src") },
    ],
  },
});
