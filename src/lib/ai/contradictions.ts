import type { ContradictionFactType, FindingSeverity } from "@prisma/client";

import {
  alignContradictionEvidence,
  contradictionDedupeKey,
  dedupeContradictionCandidates,
  isValidCrossDocumentContradiction,
  validateChunkDocumentOwnership,
} from "@/features/contradictions/lib/dedupe";
import {
  hasComparableCrossDocFacts,
  mineFactsFromChunks,
} from "@/features/contradictions/lib/fact-mining";
import {
  createContradiction,
  listContradictions,
  type ContradictionView,
} from "@/features/contradictions/lib/contradictions";
import { excerptAroundValue } from "@/features/contradictions/lib/excerpt-match";
import {
  extractedContradictionPayloadSchema,
  type ExtractedContradiction,
} from "@/features/contradictions/schemas";
import { OllamaUnavailableError, rethrowOllamaChatFailure } from "@/lib/ai/agents/run-agent";
import { getOllamaClient, type OllamaClient } from "@/lib/ai/ollama-client";
import { retrieveForRag } from "@/lib/ai/retrieval";
import { prisma } from "@/lib/db";

const CONTRADICTION_SYSTEM_PROMPT = `Compare facts extracted from multiple documents. Find inconsistencies.

Output JSON array:
[{
  "subject": string,
  "factType": "date"|"amount"|"party"|"metric"|"other",
  "valueA": string,
  "valueB": string,
  "documentAId": string,
  "chunkAId": string,
  "documentBId": string,
  "chunkBId": string,
  "explanation": string,
  "severity": "CRITICAL"|"HIGH"|"MEDIUM"|"LOW"
}]

Only flag contradictions where both values appear explicitly in context.
Require distinct documents (documentAId ≠ documentBId) and cite both chunk IDs from the excerpts provided.
If none found, return [].`;

const SEED_QUERIES = [
  "amount date party revenue contract valuation purchase price closing date effective date million",
  "lawsuit settlement damages award filed signed terminated expired",
  "headcount employee equity ownership shares percent ownership",
  "customer churn ARR MRR revenue recognition deferred",
] as const;

const CHUNK_LIMIT = 40;

export type ScanContradictionsResult = {
  created: number;
  skipped: number;
  dismissedStale: number;
  contradictions: ContradictionView[];
  batches?: number;
  message?: string;
};

type RetrievedChunk = {
  chunkId: string;
  documentId: string;
  documentName: string;
  content: string;
};

function parseContradictions(raw: string): ExtractedContradiction[] {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    const match = raw.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
    if (!match) return [];
    try {
      json = JSON.parse(match[0]);
    } catch {
      return [];
    }
  }

  const parsed = extractedContradictionPayloadSchema.safeParse(json);
  if (!parsed.success) return [];
  return Array.isArray(parsed.data) ? parsed.data : parsed.data.contradictions;
}

function buildUserPrompt(chunks: RetrievedChunk[], minedSummary: string): string {
  const blocks = chunks.map((chunk, index) =>
    [
      `--- Excerpt ${index + 1} ---`,
      `chunkId: ${chunk.chunkId}`,
      `documentId: ${chunk.documentId}`,
      `documentName: ${chunk.documentName}`,
      chunk.content.slice(0, 1600),
    ].join("\n"),
  );
  return [
    "Find cross-document contradictions in these excerpts.",
    minedSummary ? `\nHeuristic facts (hints only):\n${minedSummary}` : "",
    "\nDocument excerpts:\n",
    blocks.join("\n\n"),
  ].join("");
}

async function retrieveChunks(projectId: string, seedQuery: string): Promise<RetrievedChunk[]> {
  const retrieval = await retrieveForRag(projectId, seedQuery, {
    mode: "hybrid",
    limit: CHUNK_LIMIT,
  });
  return retrieval.results.map((row) => ({
    chunkId: row.chunkId,
    documentId: row.documentId,
    documentName: row.documentName,
    content: row.content,
  }));
}

async function countReadyDocuments(projectId: string): Promise<number> {
  return prisma.document.count({
    where: { projectId, deletedAt: null, status: "READY" },
  });
}

export async function scanContradictions(params: {
  projectId: string;
  force?: boolean;
  ollama?: Pick<OllamaClient, "healthCheck" | "chat">;
}): Promise<ScanContradictionsResult> {
  const readyDocs = await countReadyDocuments(params.projectId);
  if (readyDocs < 2) {
    return {
      created: 0,
      skipped: 0,
      dismissedStale: 0,
      contradictions: [],
      batches: 0,
      message:
        "Need at least two processed (READY) documents to scan for contradictions.",
    };
  }

  const firstChunks = await retrieveChunks(params.projectId, SEED_QUERIES[0]!);
  const distinctDocs = new Set(firstChunks.map((c) => c.documentId));
  if (firstChunks.length === 0 || distinctDocs.size < 2) {
    return {
      created: 0,
      skipped: 0,
      dismissedStale: 0,
      contradictions: [],
      batches: 0,
      message:
        "Insufficient comparable document chunks. Process more documents or re-run after indexing.",
    };
  }

  const mined = mineFactsFromChunks(firstChunks);
  // Prefer early exit when we know there is nothing comparable — still allow
  // the model pass when cross-doc chunks exist even if heuristics are thin.
  if (mined.length > 0 && !hasComparableCrossDocFacts(mined) && distinctDocs.size < 2) {
    return {
      created: 0,
      skipped: 0,
      dismissedStale: 0,
      contradictions: [],
      batches: 0,
      message: "No comparable cross-document facts found to evaluate.",
    };
  }

  const ollama = params.ollama ?? getOllamaClient();
  const health = await ollama.healthCheck();
  if (!health.ok) {
    throw new OllamaUnavailableError(
      "Contradiction scan requires Ollama. Ensure OLLAMA_BASE_URL is reachable and try again.",
    );
  }

  let dismissedStale = 0;
  if (params.force) {
    // Supersede only OPEN rows so RESOLVED/DISMISSED/ACKNOWLEDGED history remains.
    const result = await prisma.contradiction.updateMany({
      where: { projectId: params.projectId, status: "OPEN" },
      data: { status: "DISMISSED" },
    });
    dismissedStale = result.count;
  }

  const existing = await listContradictions({ projectId: params.projectId });
  const existingKeys = new Set(
    existing.map((row) =>
      contradictionDedupeKey({
        subject: row.subject,
        factType: row.factType,
        valueA: row.valueA,
        valueB: row.valueB,
      }),
    ),
  );

  const seenChunkIds = new Set<string>();
  const createdAll: ContradictionView[] = [];
  let skipped = 0;
  let batches = 0;

  for (let i = 0; i < SEED_QUERIES.length; i += 1) {
    const seed = SEED_QUERIES[i]!;
    const chunks =
      i === 0 ? firstChunks : await retrieveChunks(params.projectId, seed);
    const fresh = chunks.filter((chunk) => {
      if (seenChunkIds.has(chunk.chunkId)) return false;
      seenChunkIds.add(chunk.chunkId);
      return true;
    });
    if (i > 0 && fresh.length === 0) continue;

    const passChunks = i === 0 ? chunks : fresh;
    if (new Set(passChunks.map((c) => c.documentId)).size < 2) continue;

    batches += 1;
    const pass = await runScanPass({
      projectId: params.projectId,
      chunks: passChunks,
      ollama,
      existingKeys,
    });
    createdAll.push(...pass.created);
    skipped += pass.skipped;
  }

  return {
    created: createdAll.length,
    skipped,
    dismissedStale,
    contradictions: createdAll,
    batches,
    message:
      createdAll.length === 0 && skipped === 0
        ? "Scan completed — no contradictions found."
        : batches > 1
          ? `Completed ${batches} scan batches.`
          : undefined,
  };
}

async function runScanPass(params: {
  projectId: string;
  chunks: RetrievedChunk[];
  ollama: Pick<OllamaClient, "chat">;
  existingKeys: Set<string>;
}): Promise<{ created: ContradictionView[]; skipped: number }> {
  const { chunks, ollama } = params;
  const chunkIds = new Set(chunks.map((c) => c.chunkId));
  const documentIds = new Set(chunks.map((c) => c.documentId));
  const chunkToDocument = new Map(chunks.map((c) => [c.chunkId, c.documentId]));

  const mined = mineFactsFromChunks(chunks);
  const minedSummary = mined
    .slice(0, 40)
    .map(
      (f) =>
        `- [${f.factType}] ${f.value} (doc ${f.documentId.slice(0, 8)}… / chunk ${f.chunkId.slice(0, 8)}…)`,
    )
    .join("\n");

  let modelRows: ExtractedContradiction[] = [];
  try {
    const raw = await ollama.chat(
      [
        { role: "system", content: CONTRADICTION_SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(chunks, minedSummary) },
      ],
      { format: "json", maxTokens: 4096 },
    );
    modelRows = parseContradictions(raw);
  } catch (error) {
    rethrowOllamaChatFailure(error);
  }

  const validated = modelRows.flatMap((row) => {
    if (!isValidCrossDocumentContradiction(row, chunkIds, documentIds)) return [];
    if (!validateChunkDocumentOwnership(row, chunkToDocument)) return [];
    const aligned = alignContradictionEvidence(row, chunks);
    return aligned ? [aligned] : [];
  });

  const unique = dedupeContradictionCandidates(validated);
  const created: ContradictionView[] = [];
  let skipped = 0;

  for (const row of unique) {
    const key = contradictionDedupeKey(row);
    if (params.existingKeys.has(key)) {
      skipped += 1;
      continue;
    }

    const saved = await createContradiction({
      projectId: params.projectId,
      subject: row.subject,
      factType: row.factType as ContradictionFactType,
      valueA: row.valueA,
      valueB: row.valueB,
      documentAId: row.documentAId,
      chunkAId: row.chunkAId,
      documentBId: row.documentBId,
      chunkBId: row.chunkBId,
      explanation: row.explanation,
      severity: row.severity as FindingSeverity,
    });

    params.existingKeys.add(key);

    const chunkA = chunks.find((c) => c.chunkId === saved.chunkAId);
    const chunkB = chunks.find((c) => c.chunkId === saved.chunkBId);
    const evidenceA = excerptAroundValue(chunkA?.content, saved.valueA, {
      factType: saved.factType,
    });
    const evidenceB = excerptAroundValue(chunkB?.content, saved.valueB, {
      factType: saved.factType,
    });
    created.push({
      id: saved.id,
      projectId: saved.projectId,
      subject: saved.subject,
      factType: saved.factType,
      valueA: saved.valueA,
      valueB: saved.valueB,
      documentAId: saved.documentAId,
      documentAName: saved.documentA.name,
      chunkAId: saved.chunkAId,
      chunkAExcerpt: evidenceA.excerpt,
      valueAMatched: Boolean(evidenceA.match),
      valueAMatchedText: evidenceA.match?.matchedText ?? null,
      documentBId: saved.documentBId,
      documentBName: saved.documentB.name,
      chunkBId: saved.chunkBId,
      chunkBExcerpt: evidenceB.excerpt,
      valueBMatched: Boolean(evidenceB.match),
      valueBMatchedText: evidenceB.match?.matchedText ?? null,
      explanation: saved.explanation,
      severity: saved.severity,
      status: saved.status,
      resolutionNote: saved.resolutionNote,
      statusChangedById: saved.statusChangedById,
      statusChangedAt: saved.statusChangedAt?.toISOString() ?? null,
      promotedFindingId: saved.promotedFindingId,
      createdAt: saved.createdAt.toISOString(),
      updatedAt: saved.updatedAt.toISOString(),
    });
  }

  return { created, skipped };
}
