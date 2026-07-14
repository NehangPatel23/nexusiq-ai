/**
 * Copy Contradiction rows from local Docker Postgres → Supabase.
 * Upserts referenced Document + DocumentChunk rows (excerpts need chunk text).
 * Does NOT wipe unrelated tables; only replaces contradictions in scope.
 *
 * Requires matching project_id on Supabase (run pnpm db:sync-to-supabase first).
 * Schema must already exist (pnpm db:migrate against SUPABASE_DATABASE_URL).
 *
 * Usage:
 *   pnpm db:sync-contradictions
 *   pnpm db:sync-contradictions -- --dry-run
 *   pnpm db:sync-contradictions -- --project-id=<uuid>
 */

import { PrismaClient } from "@prisma/client";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const projectIdArg = args.find((a) => a.startsWith("--project-id="));
const projectId = projectIdArg?.slice("--project-id=".length)?.trim() || null;

/** Writable chunk columns only (skip Unsupported embedding / searchVector). */
const chunkSelect = {
  id: true,
  documentId: true,
  chunkIndex: true,
  content: true,
  tokenCount: true,
  pageNumber: true,
  sectionTitle: true,
  metadata: true,
  createdAt: true,
} as const;

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
    if (process.env.ALLOW_NONLOCAL_SOURCE !== "1") {
      console.error(
        "DATABASE_URL does not look like local Docker. Refusing to sync (set ALLOW_NONLOCAL_SOURCE=1 to override).",
      );
      process.exit(1);
    }
    console.warn("ALLOW_NONLOCAL_SOURCE=1 — skipping local-only source check.");
  }

  if (target.includes("localhost") || target.includes("127.0.0.1")) {
    console.error("SUPABASE_DATABASE_URL must not point at localhost.");
    process.exit(1);
  }

  if (!target.includes("supabase")) {
    console.warn(
      "Warning: SUPABASE_DATABASE_URL does not contain 'supabase' — double-check the target.",
    );
  }
}

function createClient(url: string) {
  return new PrismaClient({
    datasources: { db: { url } },
    log: ["error"],
  });
}

async function main() {
  const sourceUrl = requireEnv("DATABASE_URL");
  const targetUrl = requireEnv("SUPABASE_DATABASE_URL");
  assertSafeUrls(sourceUrl, targetUrl);

  const local = createClient(sourceUrl);
  const remote = createClient(targetUrl);

  try {
    console.log("Reading contradictions from local DATABASE_URL…");
    const rows = await local.contradiction.findMany({
      where: projectId ? { projectId } : undefined,
      orderBy: { createdAt: "asc" },
    });
    console.log(
      projectId
        ? `Found ${rows.length} row(s) for project ${projectId}`
        : `Found ${rows.length} contradiction row(s)`,
    );

    if (rows.length === 0) {
      console.log("Nothing to sync.");
      return;
    }

    const projectIds = [...new Set(rows.map((r) => r.projectId))];
    const documentIds = [
      ...new Set(rows.flatMap((r) => [r.documentAId, r.documentBId])),
    ];

    const chunkIds = [...new Set(rows.flatMap((r) => [r.chunkAId, r.chunkBId]))];

    const [localDocs, localChunks, remoteProjects, remoteDocs, remoteChunks] =
      await Promise.all([
        local.document.findMany({ where: { id: { in: documentIds } } }),
        // All chunks for those docs (sibling search + linked chunk IDs).
        local.documentChunk.findMany({
          where: { documentId: { in: documentIds } },
          select: chunkSelect,
          orderBy: [{ documentId: "asc" }, { chunkIndex: "asc" }],
        }),
        remote.project.findMany({
          where: { id: { in: projectIds } },
          select: { id: true },
        }),
        remote.document.findMany({
          where: { id: { in: documentIds } },
          select: { id: true },
        }),
        remote.documentChunk.findMany({
          where: { documentId: { in: documentIds } },
          select: { id: true },
        }),
      ]);

    const remoteProjectIds = new Set(remoteProjects.map((p) => p.id));
    const remoteDocIds = new Set(remoteDocs.map((d) => d.id));
    const remoteChunkIds = new Set(remoteChunks.map((c) => c.id));
    const missingProjects = projectIds.filter((id) => !remoteProjectIds.has(id));
    const missingDocIds = documentIds.filter((id) => !remoteDocIds.has(id));
    const missingChunkIds = localChunks
      .map((c) => c.id)
      .filter((id) => !remoteChunkIds.has(id));
    const localDocById = new Map(localDocs.map((d) => [d.id, d]));
    const missingLocalDocs = documentIds.filter((id) => !localDocById.has(id));
    const missingLinkedChunks = chunkIds.filter(
      (id) => !localChunks.some((c) => c.id === id),
    );

    if (missingLocalDocs.length > 0) {
      console.error(
        "Local DB is missing Document rows referenced by contradictions:",
        missingLocalDocs.join(", "),
      );
      process.exit(1);
    }

    if (missingLinkedChunks.length > 0) {
      console.warn(
        `Warning: ${missingLinkedChunks.length} linked chunk id(s) missing locally — excerpts may stay empty.`,
      );
    }

    if (missingProjects.length > 0) {
      console.error(
        "Cannot sync: Supabase is missing project_id(s). Run pnpm db:sync-to-supabase first.",
      );
      console.error(missingProjects.join(", "));
      process.exit(1);
    }

    if (dryRun) {
      const byProject = new Map<string, number>();
      for (const row of rows) {
        byProject.set(row.projectId, (byProject.get(row.projectId) ?? 0) + 1);
      }
      console.log("By project:", Object.fromEntries(byProject));
      console.log(
        `Documents to upsert if missing: ${missingDocIds.length}/${documentIds.length}`,
      );
      for (const id of missingDocIds) {
        const doc = localDocById.get(id)!;
        console.log(`  - ${doc.name} (${doc.id})`);
      }
      console.log(
        `Chunks to upsert if missing: ${missingChunkIds.length}/${localChunks.length}`,
      );
      console.log("Dry run — no changes written to Supabase.");
      return;
    }

    if (missingDocIds.length > 0) {
      console.log(
        `Upserting ${missingDocIds.length} missing document(s) onto Supabase…`,
      );
      // Clear optional FKs so we don't need folders/version chains on remote.
      const payload = missingDocIds.map((id) => {
        const doc = localDocById.get(id)!;
        return {
          ...doc,
          folderId: null,
          previousVersionId: null,
          duplicateOfId: null,
        };
      });
      await remote.document.createMany({ data: payload });
      for (const doc of payload) {
        console.log(`  + ${doc.name} (${doc.id})`);
      }
    } else {
      console.log("All referenced documents already exist on Supabase.");
    }

    if (missingChunkIds.length > 0) {
      const toInsert = localChunks
        .filter((c) => missingChunkIds.includes(c.id))
        .map((c) => ({
          ...c,
          metadata: c.metadata === null ? undefined : c.metadata,
        }));
      console.log(`Upserting ${toInsert.length} document chunk(s) onto Supabase…`);
      // Chunks of ~1–2k tokens; batch to stay under packet limits.
      const batchSize = 50;
      for (let i = 0; i < toInsert.length; i += batchSize) {
        await remote.documentChunk.createMany({
          data: toInsert.slice(i, i + batchSize),
          skipDuplicates: true,
        });
      }
    } else {
      console.log("All document chunks already exist on Supabase.");
    }

    console.log("Replacing contradictions on Supabase…");
    await remote.$transaction(async (tx) => {
      if (projectId) {
        await tx.contradiction.deleteMany({ where: { projectId } });
      } else {
        await tx.contradiction.deleteMany({});
      }
      await tx.contradiction.createMany({ data: rows });
    });

    console.log(`Synced ${rows.length} contradiction(s) to Supabase.`);
  } finally {
    await Promise.all([local.$disconnect(), remote.$disconnect()]);
  }
}

main().catch((error) => {
  console.error("Sync failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
