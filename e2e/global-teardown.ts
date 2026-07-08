import { PrismaClient } from "@prisma/client";

import { purgeTestUsers } from "../scripts/lib/test-data";

const LOCAL_DATABASE_URL =
  process.env.E2E_DATABASE_URL ??
  "postgresql://nexusiq:nexusiq@localhost:5433/nexusiq?schema=public";

export default async function globalTeardown() {
  const url = process.env.DATABASE_URL ?? LOCAL_DATABASE_URL;

  if (!url.includes("localhost") && !url.includes("127.0.0.1")) {
    console.warn("[e2e teardown] Skipping purge — DATABASE_URL is not local Docker.");
    return;
  }

  const prisma = new PrismaClient({
    datasources: { db: { url } },
  });

  try {
    const { users, organizations } = await purgeTestUsers(prisma);
    if (users > 0 || organizations > 0) {
      console.log(`[e2e teardown] Removed ${users} test user(s), ${organizations} empty org(s).`);
    }
  } finally {
    await prisma.$disconnect();
  }
}
