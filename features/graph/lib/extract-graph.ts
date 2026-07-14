import { upsertEntityByKey } from "@/features/graph/lib/graph-data";
import { normalizeEntityName, normalizeEntityType } from "@/features/graph/lib/normalize";
import {
  extractedGraphPayloadSchema,
  type ExtractedGraphPayload,
} from "@/features/graph/schemas";
import { OllamaUnavailableError, rethrowOllamaChatFailure } from "@/lib/ai/agents/run-agent";
import { getOllamaClient, type OllamaClient } from "@/lib/ai/ollama-client";
import { retrieveForRag } from "@/lib/ai/retrieval";
import { prisma } from "@/lib/db";

const GRAPH_SYSTEM_PROMPT = `Extract entities and relationships from document excerpts.
Return JSON:
{
  "entities": [{ "name": string, "type": "person"|"organization"|"location"|"date"|"amount"|"other" }],
  "relations": [{ "source": string, "target": string, "type": string, "confidence": number, "sourceChunkId": string }]
}
Only extract explicitly mentioned entities. Do not infer relationships without evidence.`;

const GRAPH_SEED_QUERY =
  "companies people investors subsidiaries board officers contracts locations organizations relationships ownership";

const BATCH_SEED_QUERIES = [
  GRAPH_SEED_QUERY,
  "investors limited partners venture capital shareholders ownership stake",
  "subsidiaries affiliates parent company acquired merger JV joint venture",
  "board directors officers CEO CFO employed reports to hired",
  "vendors customers suppliers contracts parties counterparty locations",
] as const;

const CHUNK_LIMIT = 25;

export type ExtractGraphResult = {
  entitiesUpserted: number;
  relationsCreated: number;
  skippedRelations: number;
  batches?: number;
  message?: string;
};

type RetrievedChunk = {
  chunkId: string;
  documentId: string;
  documentName: string;
  content: string;
};

function parseGraphPayload(raw: string): ExtractedGraphPayload {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return { entities: [], relations: [] };
    try {
      json = JSON.parse(match[0]);
    } catch {
      return { entities: [], relations: [] };
    }
  }
  const parsed = extractedGraphPayloadSchema.safeParse(json);
  if (!parsed.success) return { entities: [], relations: [] };
  return parsed.data;
}

function buildUserPrompt(chunks: RetrievedChunk[]): string {
  return chunks
    .map((chunk, index) => {
      return [
        `--- Excerpt ${index + 1} ---`,
        `sourceChunkId: ${chunk.chunkId}`,
        `documentId: ${chunk.documentId}`,
        `documentName: ${chunk.documentName}`,
        chunk.content.slice(0, 1600),
      ].join("\n");
    })
    .join("\n\n");
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

async function applyGraphPayload(params: {
  projectId: string;
  chunks: RetrievedChunk[];
  payload: ExtractedGraphPayload;
  cache: Map<string, string>;
}): Promise<{ entitiesUpserted: number; relationsCreated: number; skippedRelations: number }> {
  const chunkIds = new Set(params.chunks.map((c) => c.chunkId));
  let entitiesUpserted = 0;

  for (const entity of params.payload.entities) {
    const before = params.cache.size;
    await upsertEntityByKey({
      projectId: params.projectId,
      name: entity.name,
      type: entity.type,
      cache: params.cache,
    });
    if (params.cache.size > before) entitiesUpserted += 1;
  }

  for (const relation of params.payload.relations) {
    await upsertEntityByKey({
      projectId: params.projectId,
      name: relation.source,
      type: "other",
      cache: params.cache,
    });
    await upsertEntityByKey({
      projectId: params.projectId,
      name: relation.target,
      type: "other",
      cache: params.cache,
    });
  }

  let relationsCreated = 0;
  let skippedRelations = 0;

  for (const relation of params.payload.relations) {
    if (!chunkIds.has(relation.sourceChunkId)) {
      skippedRelations += 1;
      continue;
    }

    const sourceName = normalizeEntityName(relation.source);
    const targetName = normalizeEntityName(relation.target);
    if (!sourceName || !targetName || sourceName.toLowerCase() === targetName.toLowerCase()) {
      skippedRelations += 1;
      continue;
    }

    const sourceId = await upsertEntityByKey({
      projectId: params.projectId,
      name: sourceName,
      type: "other",
      cache: params.cache,
    });
    const targetId = await upsertEntityByKey({
      projectId: params.projectId,
      name: targetName,
      type: "other",
      cache: params.cache,
    });

    if (sourceId === targetId) {
      skippedRelations += 1;
      continue;
    }

    const relationType = (relation.type ?? relation.relationType ?? "related_to").trim();
    const confidence = Math.min(1, Math.max(0, relation.confidence ?? 0.6));

    const existing = await prisma.entityRelation.findFirst({
      where: {
        projectId: params.projectId,
        sourceEntityId: sourceId,
        targetEntityId: targetId,
        relationType,
        sourceChunkId: relation.sourceChunkId,
      },
      select: { id: true },
    });
    if (existing) {
      skippedRelations += 1;
      continue;
    }

    await prisma.entityRelation.create({
      data: {
        projectId: params.projectId,
        sourceEntityId: sourceId,
        targetEntityId: targetId,
        relationType,
        confidence,
        sourceChunkId: relation.sourceChunkId,
      },
    });
    relationsCreated += 1;
  }

  return { entitiesUpserted, relationsCreated, skippedRelations };
}

export async function extractGraphEntities(params: {
  projectId: string;
  force?: boolean;
  all?: boolean;
  seedQuery?: string;
  ollama?: Pick<OllamaClient, "healthCheck" | "chat">;
}): Promise<ExtractGraphResult> {
  const seeds =
    params.seedQuery?.trim()
      ? [params.seedQuery.trim()]
      : params.all
        ? [...BATCH_SEED_QUERIES]
        : [GRAPH_SEED_QUERY];

  const firstChunks = await retrieveChunks(params.projectId, seeds[0]!);
  if (firstChunks.length === 0) {
    return {
      entitiesUpserted: 0,
      relationsCreated: 0,
      skippedRelations: 0,
      batches: 0,
      message:
        "No document chunks available for graph extraction. Process documents in the data room first.",
    };
  }

  const ollama = params.ollama ?? getOllamaClient();
  const health = await ollama.healthCheck();
  if (!health.ok) {
    throw new OllamaUnavailableError(
      "Graph extraction requires Ollama. Ensure OLLAMA_BASE_URL is reachable and try again.",
    );
  }

  if (params.force) {
    await prisma.entityRelation.deleteMany({ where: { projectId: params.projectId } });
    await prisma.entity.deleteMany({ where: { projectId: params.projectId } });
  }

  const cache = new Map<string, string>();
  const seenChunkIds = new Set<string>();
  let entitiesUpserted = 0;
  let relationsCreated = 0;
  let skippedRelations = 0;
  let batches = 0;

  for (let i = 0; i < seeds.length; i += 1) {
    const seed = seeds[i]!;
    const chunks =
      i === 0 ? firstChunks : await retrieveChunks(params.projectId, seed);
    const fresh = chunks.filter((chunk) => {
      if (seenChunkIds.has(chunk.chunkId)) return false;
      seenChunkIds.add(chunk.chunkId);
      return true;
    });
    if (i > 0 && fresh.length === 0) continue;
    batches += 1;

    const passChunks = i === 0 ? chunks : fresh.length > 0 ? fresh : chunks;
    let payload: ExtractedGraphPayload = { entities: [], relations: [] };
    try {
      const raw = await ollama.chat(
        [
          { role: "system", content: GRAPH_SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(passChunks) },
        ],
        { format: "json", maxTokens: 4096 },
      );
      payload = parseGraphPayload(raw);
    } catch (error) {
      rethrowOllamaChatFailure(error);
    }

    const applied = await applyGraphPayload({
      projectId: params.projectId,
      chunks: passChunks,
      payload,
      cache,
    });
    entitiesUpserted += applied.entitiesUpserted;
    relationsCreated += applied.relationsCreated;
    skippedRelations += applied.skippedRelations;
  }

  const stale = await prisma.entity.findMany({
    where: { projectId: params.projectId },
    select: { id: true, type: true },
  });
  for (const row of stale) {
    const normalized = normalizeEntityType(row.type);
    if (normalized !== row.type) {
      await prisma.entity.update({
        where: { id: row.id },
        data: { type: normalized },
      });
    }
  }

  return {
    entitiesUpserted,
    relationsCreated,
    skippedRelations,
    batches,
    message: params.all && batches > 1 ? `Completed ${batches} extract batches.` : undefined,
  };
}
