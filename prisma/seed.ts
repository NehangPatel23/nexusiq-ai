import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Phase 0: no seed data — auth slice will add initial fixtures.
  const userCount = await prisma.user.count();
  console.log(`Seed complete. Users in database: ${userCount}`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
