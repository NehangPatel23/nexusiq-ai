/**
 * Copy app data from local Docker Postgres (DATABASE_URL) to Supabase (SUPABASE_DATABASE_URL).
 * Schema must already exist on Supabase (pnpm db:migrate with session pooler URL).
 *
 * Usage:
 *   pnpm db:sync-to-supabase
 *   pnpm db:sync-to-supabase -- --dry-run
 */

import { Prisma, PrismaClient } from "@prisma/client";

import { countSnapshot, excludeTestData } from "./lib/test-data";

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const includeTestData = args.has("--include-test-data");

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`Missing ${name}. Add it to .env (see .env.example).`);
    process.exit(1);
  }
  return value;
}

function assertSafeUrls(sourceUrl: string, targetUrl: string) {
  const source = sourceUrl.toLowerCase();
  const target = targetUrl.toLowerCase();

  if (!source.includes("localhost") && !source.includes("127.0.0.1")) {
    console.error(
      "DATABASE_URL does not look like local Docker. Refusing to sync (set ALLOW_NONLOCAL_SOURCE=1 to override).",
    );
    process.exit(1);
  }

  if (target.includes("localhost") || target.includes("127.0.0.1")) {
    console.error("SUPABASE_DATABASE_URL must not point at localhost.");
    process.exit(1);
  }

  if (!target.includes("supabase")) {
    console.warn("Warning: SUPABASE_DATABASE_URL does not contain 'supabase' — double-check the target.");
  }
}

function createClient(url: string) {
  return new PrismaClient({
    datasources: { db: { url } },
    log: ["error"],
  });
}

async function exportLocal(local: PrismaClient) {
  const [
    users,
    passwordResetTokens,
    organizations,
    organizationMembers,
    teams,
    teamMembers,
    workspaces,
    projects,
    invites,
    notifications,
  ] = await Promise.all([
    local.user.findMany(),
    local.passwordResetToken.findMany(),
    local.organization.findMany(),
    local.organizationMember.findMany(),
    local.team.findMany(),
    local.teamMember.findMany(),
    local.workspace.findMany(),
    local.project.findMany(),
    local.invite.findMany(),
    local.notification.findMany(),
  ]);

  return {
    users,
    passwordResetTokens,
    organizations,
    organizationMembers,
    teams,
    teamMembers,
    workspaces,
    projects,
    invites,
    notifications,
  };
}

function toProjectCreateManyInput(
  project: Awaited<ReturnType<typeof exportLocal>>["projects"][number],
): Prisma.ProjectCreateManyInput {
  const { metadata, ...rest } = project;
  return {
    ...rest,
    metadata:
      metadata === null || metadata === undefined
        ? Prisma.DbNull
        : (metadata as Prisma.InputJsonValue),
  };
}

async function importRemote(
  remote: PrismaClient,
  data: Awaited<ReturnType<typeof exportLocal>>,
) {
  await remote.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`
      TRUNCATE TABLE
        notifications,
        projects,
        workspaces,
        team_members,
        teams,
        invites,
        organization_members,
        organizations,
        password_reset_tokens,
        users
      RESTART IDENTITY CASCADE;
    `);

    if (data.users.length > 0) {
      await tx.user.createMany({
        data: data.users.map((user) => ({
          ...user,
          notificationPrefs:
            user.notificationPrefs === null || user.notificationPrefs === undefined
              ? Prisma.DbNull
              : (user.notificationPrefs as Prisma.InputJsonValue),
        })),
      });
    }
    if (data.passwordResetTokens.length > 0) {
      await tx.passwordResetToken.createMany({ data: data.passwordResetTokens });
    }
    if (data.organizations.length > 0) {
      await tx.organization.createMany({ data: data.organizations });
    }
    if (data.organizationMembers.length > 0) {
      await tx.organizationMember.createMany({ data: data.organizationMembers });
    }
    if (data.teams.length > 0) {
      await tx.team.createMany({ data: data.teams });
    }
    if (data.teamMembers.length > 0) {
      await tx.teamMember.createMany({ data: data.teamMembers });
    }
    if (data.workspaces.length > 0) {
      await tx.workspace.createMany({ data: data.workspaces });
    }
    if (data.projects.length > 0) {
      await tx.project.createMany({
        data: data.projects.map(toProjectCreateManyInput),
      });
    }
    if (data.invites.length > 0) {
      await tx.invite.createMany({ data: data.invites });
    }
    if (data.notifications.length > 0) {
      await tx.notification.createMany({ data: data.notifications });
    }
  });
}

async function main() {
  const sourceUrl = requireEnv("DATABASE_URL");
  const targetUrl = requireEnv("SUPABASE_DATABASE_URL");

  if (process.env.ALLOW_NONLOCAL_SOURCE === "1") {
    console.warn("ALLOW_NONLOCAL_SOURCE=1 — skipping local-only source check.");
    if (targetUrl.includes("localhost") || targetUrl.includes("127.0.0.1")) {
      console.error("SUPABASE_DATABASE_URL must not point at localhost.");
      process.exit(1);
    }
  } else {
    assertSafeUrls(sourceUrl, targetUrl);
  }

  const local = createClient(sourceUrl);
  const remote = createClient(targetUrl);

  try {
    console.log("Reading from local DATABASE_URL…");
    const exported = await exportLocal(local);
    const data = includeTestData ? exported : excludeTestData(exported);

    if (!includeTestData) {
      console.log("Excluded e2e/integration test users (@test.com, org-*@example.com).");
      console.log("Use --include-test-data to copy them.");
    }

    const counts = countSnapshot(data);

    console.log(includeTestData ? "Local rows:" : "Rows to sync:", counts);

    if (dryRun) {
      console.log("Dry run — no changes written to Supabase.");
      return;
    }

    console.log("Truncating app tables on Supabase and importing…");
    await importRemote(remote, data);

    console.log("Sync complete. Log in on Vercel with the same email/password as local.");
  } finally {
    await Promise.all([local.$disconnect(), remote.$disconnect()]);
  }
}

main().catch((error) => {
  console.error("Sync failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
