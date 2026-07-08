/**
 * Remove e2e / integration test users and empty organizations.
 *
 * Usage:
 *   pnpm db:purge-test-users              # local DATABASE_URL
 *   pnpm db:purge-test-users -- --remote  # SUPABASE_DATABASE_URL
 */

import { PrismaClient } from "@prisma/client";

import { purgeTestUsers } from "./lib/test-data";

const useRemote = process.argv.includes("--remote");

function resolveDatabaseUrl(): string {
  const name = useRemote ? "SUPABASE_DATABASE_URL" : "DATABASE_URL";
  const url = process.env[name]?.trim();
  if (!url) {
    console.error(`Missing ${name}.`);
    process.exit(1);
  }
  return url;
}

async function main() {
  const url = resolveDatabaseUrl();
  const label = useRemote ? "Supabase" : "local";

  if (useRemote && (url.includes("localhost") || url.includes("127.0.0.1"))) {
    console.error("SUPABASE_DATABASE_URL must not point at localhost.");
    process.exit(1);
  }

  const prisma = new PrismaClient({
    datasources: { db: { url } },
  });

  try {
    const { users, organizations } = await purgeTestUsers(prisma);
    console.log(`${label}: removed ${users} test user(s) and ${organizations} empty organization(s).`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Purge failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
