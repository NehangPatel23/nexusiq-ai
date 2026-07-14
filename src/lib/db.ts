import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

/**
 * After `prisma generate`, Next.js can keep a stale global client from before
 * new models existed (e.g. `prisma.report` undefined). Recreate when missing.
 */
function getPrismaClient(): PrismaClient {
  const existing = globalForPrisma.prisma;
  if (
    existing &&
    "report" in existing &&
    typeof existing.report !== "undefined" &&
    "reportShare" in existing &&
    typeof existing.reportShare !== "undefined"
  ) {
    return existing;
  }

  if (existing) {
    void existing.$disconnect().catch(() => undefined);
  }

  const client = createPrismaClient();
  globalForPrisma.prisma = client;
  return client;
}

export const prisma = getPrismaClient();

// Reuse one client per serverless instance (required on Vercel).
globalForPrisma.prisma = prisma;
