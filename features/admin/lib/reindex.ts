import { logAudit } from "@/features/history/lib/audit";
import { embedTexts, formatVectorLiteral } from "@/lib/ai/embeddings";
import { getOllamaClient, healthCheck, resetOllamaClient } from "@/lib/ai/ollama-client";
import { prisma } from "@/lib/db";

import { buildChunkOrgFilterSql, describeFtsReindexScope } from "./org-scope";

export type ReindexMode = "fts" | "embeddings" | "all";

export type ReindexResult = {
  mode: ReindexMode;
  updatedChunks: number;
  tookMs: number;
  ollamaUsed: boolean;
  strategy: "inline" | "enqueued" | "partial";
  /** Present when Vercel enqueues docs for worker instead of inline embed. */
  enqueuedDocuments?: number;
  /** Cursor for resume when partial (chunk id). */
  nextCursor?: string | null;
  message?: string;
};

/** Max chunks to embed inline per request on Vercel before enqueueing for worker. */
export const INLINE_EMBED_MAX_CHUNKS = 500;
export const EMBED_BATCH_SIZE = 25;

export { describeFtsReindexScope };

/**
 * Reindex / re-embed strategy (B+C Ollama — same client + config as Settings):
 *
 * A) mode "fts" → SQL rebuild of search_vector for all chunks in org projects.
 *    Does NOT require Ollama.
 *
 * B) mode "embeddings" | "all" → requires reachable Ollama.
 *    - Process embeddings in batches (EMBED_BATCH_SIZE).
 *    - Route uses maxDuration 120–300.
 *    - On VERCEL with a large corpus (> INLINE_EMBED_MAX_CHUNKS): set matching
 *      READY documents to PENDING so the worker (local or OCI) reprocesses,
 *      instead of blocking the serverless request. See docs/deployment.md and
 *      tasks/00-oci-worker-vps.md.
 */
export async function runAdminReindex(options: {
  organizationId: string;
  userId: string;
  mode: ReindexMode;
  projectId?: string | null;
  cursor?: string | null;
  confirm: boolean;
}): Promise<ReindexResult> {
  if (!options.confirm) {
    throw new ReindexValidationError("confirm must be true");
  }

  const started = Date.now();
  let updatedChunks = 0;
  let ollamaUsed = false;
  let strategy: ReindexResult["strategy"] = "inline";
  let enqueuedDocuments: number | undefined;
  let nextCursor: string | null | undefined;
  let message: string | undefined;

  if (options.mode === "fts" || options.mode === "all") {
    updatedChunks += await rebuildFtsVectors(options.organizationId, options.projectId);
  }

  if (options.mode === "embeddings" || options.mode === "all") {
    resetOllamaClient();
    const health = await healthCheck();
    if (!health.ok) {
      throw new ReindexOllamaError(
        health.error || "Ollama is unreachable — re-embed requires Ollama",
      );
    }
    ollamaUsed = true;

    const chunkCount = await countScopedChunks(options.organizationId, options.projectId);
    const onVercel = Boolean(process.env.VERCEL);

    if (onVercel && chunkCount > INLINE_EMBED_MAX_CHUNKS && !options.cursor) {
      enqueuedDocuments = await enqueueDocumentsForReprocess(
        options.organizationId,
        options.projectId,
      );
      strategy = "enqueued";
      message =
        `Large corpus (${chunkCount} chunks) on Vercel — ${enqueuedDocuments} document(s) set to PENDING for worker reprocess. ` +
        `FTS${options.mode === "all" ? " was updated inline" : " skipped"}; embeddings will run on the worker.`;
    } else {
      const embedResult = await reembedChunksBatch({
        organizationId: options.organizationId,
        projectId: options.projectId,
        cursor: options.cursor,
        maxChunks: onVercel ? Math.min(INLINE_EMBED_MAX_CHUNKS, 200) : INLINE_EMBED_MAX_CHUNKS,
      });
      updatedChunks += embedResult.updated;
      nextCursor = embedResult.nextCursor;
      if (nextCursor) {
        strategy = "partial";
        message = `Processed ${embedResult.updated} chunks; pass nextCursor to continue.`;
      }
    }
  }

  await logAudit({
    organizationId: options.organizationId,
    userId: options.userId,
    action: "MAINTENANCE",
    entityType: "DocumentChunk",
    entityId: options.projectId ?? options.organizationId,
    metadata: {
      detail: "reindex",
      mode: options.mode,
      updatedChunks,
      ollamaUsed,
      strategy,
      enqueuedDocuments,
    },
  });

  return {
    mode: options.mode,
    updatedChunks,
    tookMs: Date.now() - started,
    ollamaUsed,
    strategy,
    enqueuedDocuments,
    nextCursor: nextCursor ?? null,
    message,
  };
}

export class ReindexValidationError extends Error {
  readonly code = "VALIDATION_ERROR";
  constructor(message: string) {
    super(message);
    this.name = "ReindexValidationError";
  }
}

export class ReindexOllamaError extends Error {
  readonly code = "OLLAMA_UNAVAILABLE";
  constructor(message: string) {
    super(message);
    this.name = "ReindexOllamaError";
  }
}

async function rebuildFtsVectors(
  organizationId: string,
  projectId?: string | null,
): Promise<number> {
  const { joinAndWhere } = buildChunkOrgFilterSql(organizationId, projectId);

  // Prisma doesn't return row count for UPDATE easily with raw — use CTE count.
  const result = await prisma.$executeRaw`
    UPDATE document_chunks AS dc
    SET search_vector = to_tsvector('english', dc.content)
    WHERE dc.id IN (
      SELECT dc.id
      ${joinAndWhere}
    )
  `;

  return typeof result === "number" ? result : 0;
}

async function countScopedChunks(
  organizationId: string,
  projectId?: string | null,
): Promise<number> {
  const { joinAndWhere } = buildChunkOrgFilterSql(organizationId, projectId);
  const rows = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count
    ${joinAndWhere}
  `;
  return Number(rows[0]?.count ?? 0);
}

async function enqueueDocumentsForReprocess(
  organizationId: string,
  projectId?: string | null,
): Promise<number> {
  const { resetDocumentForReprocess } = await import("@/lib/ai/processing/reprocess");

  const docs = await prisma.document.findMany({
    where: {
      deletedAt: null,
      status: { in: ["READY", "FAILED"] },
      ...(projectId ? { projectId } : {}),
      project: {
        deletedAt: null,
        workspace: {
          organizationId,
          deletedAt: null,
        },
      },
    },
    select: { id: true },
  });

  for (const doc of docs) {
    await resetDocumentForReprocess(doc.id);
  }

  return docs.length;
}

async function reembedChunksBatch(options: {
  organizationId: string;
  projectId?: string | null;
  cursor?: string | null;
  maxChunks: number;
}): Promise<{ updated: number; nextCursor: string | null }> {
  const { joinAndWhere } = buildChunkOrgFilterSql(options.organizationId, options.projectId);

  const chunks = options.cursor
    ? await prisma.$queryRaw<Array<{ id: string; content: string }>>`
        SELECT dc.id, dc.content
        ${joinAndWhere}
        AND dc.id > ${options.cursor}
        ORDER BY dc.id ASC
        LIMIT ${options.maxChunks}
      `
    : await prisma.$queryRaw<Array<{ id: string; content: string }>>`
        SELECT dc.id, dc.content
        ${joinAndWhere}
        ORDER BY dc.id ASC
        LIMIT ${options.maxChunks}
      `;

  if (chunks.length === 0) {
    return { updated: 0, nextCursor: null };
  }

  const client = getOllamaClient();
  let updated = 0;

  for (let i = 0; i < chunks.length; i += EMBED_BATCH_SIZE) {
    const batch = chunks.slice(i, i + EMBED_BATCH_SIZE);
    const embeddings = await embedTexts(
      batch.map((c) => c.content),
      client,
    );

    for (let j = 0; j < batch.length; j++) {
      const chunk = batch[j]!;
      const embedding = embeddings[j];
      if (!embedding || embedding.length === 0) continue;
      const vectorLiteral = formatVectorLiteral(embedding);
      await prisma.$executeRaw`
        UPDATE document_chunks
        SET embedding = ${vectorLiteral}::vector
        WHERE id = ${chunk.id}
      `;
      updated += 1;
    }
  }

  const lastId = chunks[chunks.length - 1]?.id ?? null;
  if (!lastId) return { updated, nextCursor: null };

  const more = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT dc.id
    ${joinAndWhere}
    AND dc.id > ${lastId}
    ORDER BY dc.id ASC
    LIMIT 1
  `;

  return {
    updated,
    nextCursor: more.length > 0 ? lastId : null,
  };
}
