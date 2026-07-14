#!/usr/bin/env tsx
/**
 * Purge expired tombstoned users and organizations (24h grace).
 * Usage: pnpm db:purge-deleted
 */
import { purgeExpiredEntities } from "../features/history/lib/purge";
import { prisma } from "../src/lib/db";

async function main() {
  const result = await purgeExpiredEntities();
  console.log(
    `Purged ${result.usersPurged} user(s) and ${result.orgsPurged} organization(s).`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
