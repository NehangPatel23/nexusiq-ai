import type { TimelineCategory } from "@prisma/client";

import { classifyTimelineCategory } from "@/features/timeline/lib/category";
import { dedupeTimelineCandidates, isDuplicateTimelineEvent } from "@/features/timeline/lib/dedupe";
import { extractOfflineDateCandidates } from "@/features/timeline/lib/offline-dates";
import {
  createTimelineEvent,
  listTimelineEvents,
  type TimelineEventView,
} from "@/features/timeline/lib/timeline-events";
import {
  extractedTimelinePayloadSchema,
  type ExtractedTimelineEvent,
} from "@/features/timeline/schemas";
import { OllamaUnavailableError, rethrowOllamaChatFailure } from "@/lib/ai/agents/run-agent";
import { getOllamaClient, type OllamaClient } from "@/lib/ai/ollama-client";
import { retrieveForRag } from "@/lib/ai/retrieval";
import { prisma } from "@/lib/db";

const TIMELINE_SYSTEM_PROMPT = `Extract dated events from the provided document excerpts.
Return JSON array:
[{ "title": string, "description": string, "eventDate": "ISO8601", "sourceChunkId": string, "documentId": string, "category"?: "FUNDING"|"HIRING"|"ACQUISITION"|"LAWSUIT"|"LEADERSHIP"|"REVENUE"|"CONTRACT"|"OTHER" }]

Only include events with explicit dates in the source text.
Cite source chunk for each event.
If no dated events found, return empty array.`;

const DATE_SEED_QUERY =
  "funding hiring acquisition lawsuit contract revenue dates leadership board Series A ISO date announced signed closed";

const BATCH_SEED_QUERIES = [
  DATE_SEED_QUERY,
  "lawsuit legal court settlement litigation complaint filed sued",
  "hiring leadership appointed CEO CFO board director joined resigned",
  "contract revenue partnership customer agreement signed renewed",
  "acquisition merger invest purchase closed series funding raised",
] as const;

const CHUNK_LIMIT = 25;

export type ExtractTimelineResult = {
  created: number;
  skipped: number;
  events: TimelineEventView[];
  batches?: number;
  message?: string;
};

type RetrievedChunk = {
  chunkId: string;
  documentId: string;
  documentName: string;
  content: string;
};

function parseExtractedEvents(raw: string): ExtractedTimelineEvent[] {
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

  const parsed = extractedTimelinePayloadSchema.safeParse(json);
  if (!parsed.success) return [];
  return Array.isArray(parsed.data) ? parsed.data : parsed.data.events;
}

function resolveCategory(event: {
  title: string;
  description?: string | null;
  category?: TimelineCategory;
}): TimelineCategory {
  if (event.category) return event.category;
  return classifyTimelineCategory(event.title, event.description);
}

function buildUserPrompt(chunks: RetrievedChunk[]): string {
  const blocks = chunks.map((chunk, index) => {
    return [
      `--- Excerpt ${index + 1} ---`,
      `sourceChunkId: ${chunk.chunkId}`,
      `documentId: ${chunk.documentId}`,
      `documentName: ${chunk.documentName}`,
      chunk.content.slice(0, 1800),
    ].join("\n");
  });
  return `Document excerpts:\n\n${blocks.join("\n\n")}`;
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

async function runExtractPass(params: {
  projectId: string;
  chunks: RetrievedChunk[];
  ollama: Pick<OllamaClient, "chat">;
  existingKeys: Array<{ title: string; eventDate: Date; documentId: string | null }>;
}): Promise<{ created: TimelineEventView[]; skipped: number }> {
  const { chunks, ollama } = params;
  if (chunks.length === 0) return { created: [], skipped: 0 };

  const chunkIds = new Set(chunks.map((c) => c.chunkId));
  const documentIds = new Set(chunks.map((c) => c.documentId));

  let modelEvents: ExtractedTimelineEvent[] = [];
  try {
    const raw = await ollama.chat(
      [
        { role: "system", content: TIMELINE_SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(chunks) },
      ],
      { format: "json", maxTokens: 4096 },
    );
    modelEvents = parseExtractedEvents(raw);
  } catch (error) {
    rethrowOllamaChatFailure(error);
  }

  const offline = extractOfflineDateCandidates(chunks).map((c) => ({
    title: c.title,
    description: c.description,
    eventDate: c.eventDate,
    sourceChunkId: c.sourceChunkId,
    documentId: c.documentId,
  }));

  const combined = [...modelEvents, ...offline];
  const validated = combined.filter((event) => {
    if (!chunkIds.has(event.sourceChunkId)) return false;
    if (!documentIds.has(event.documentId)) return false;
    const date = new Date(event.eventDate);
    return !Number.isNaN(date.getTime());
  });

  const unique = dedupeTimelineCandidates(
    validated.map((event) => ({
      ...event,
      eventDate: new Date(event.eventDate),
    })),
  );

  const createdEvents: TimelineEventView[] = [];
  let skipped = 0;

  for (const event of unique) {
    const candidate = {
      title: event.title,
      eventDate: event.eventDate,
      documentId: event.documentId,
    };
    if (params.existingKeys.some((row) => isDuplicateTimelineEvent(candidate, row))) {
      skipped += 1;
      continue;
    }

    const created = await createTimelineEvent({
      projectId: params.projectId,
      isManual: false,
      input: {
        title: event.title,
        description: event.description ?? null,
        eventDate: event.eventDate.toISOString(),
        category: resolveCategory(event),
        documentId: event.documentId,
        sourceChunkId: event.sourceChunkId,
      },
    });
    createdEvents.push(created);
    params.existingKeys.push(candidate);
  }

  return { created: createdEvents, skipped };
}

export async function extractTimelineEvents(params: {
  projectId: string;
  force?: boolean;
  all?: boolean;
  seedQuery?: string;
  ollama?: Pick<OllamaClient, "healthCheck" | "chat">;
}): Promise<ExtractTimelineResult> {
  const seeds =
    params.seedQuery?.trim()
      ? [params.seedQuery.trim()]
      : params.all
        ? [...BATCH_SEED_QUERIES]
        : [DATE_SEED_QUERY];

  const firstChunks = await retrieveChunks(params.projectId, seeds[0]!);
  if (firstChunks.length === 0) {
    return {
      created: 0,
      skipped: 0,
      events: [],
      batches: 0,
      message:
        "No document chunks available for timeline extraction. Process documents in the data room first.",
    };
  }

  const ollama = params.ollama ?? getOllamaClient();
  const health = await ollama.healthCheck();
  if (!health.ok) {
    throw new OllamaUnavailableError(
      "Timeline extraction requires Ollama. Ensure OLLAMA_BASE_URL is reachable and try again.",
    );
  }

  if (params.force) {
    await prisma.timelineEvent.deleteMany({
      where: { projectId: params.projectId, isManual: false, deletedAt: null },
    });
  }

  const existing = await listTimelineEvents({ projectId: params.projectId, trash: "active" });
  const existingKeys = existing.map((row) => ({
    title: row.title,
    eventDate: new Date(row.eventDate),
    documentId: row.documentId,
  }));

  const seenChunkIds = new Set<string>();
  const createdAll: TimelineEventView[] = [];
  let skipped = 0;
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
    // Always run first batch; later batches skip if no new chunks.
    if (i > 0 && fresh.length === 0) continue;
    batches += 1;
    const pass = await runExtractPass({
      projectId: params.projectId,
      chunks: i === 0 ? chunks : fresh.length > 0 ? fresh : chunks,
      ollama,
      existingKeys,
    });
    createdAll.push(...pass.created);
    skipped += pass.skipped;
  }

  return {
    created: createdAll.length,
    skipped,
    events: createdAll,
    batches,
    message:
      params.all && batches > 1
        ? `Completed ${batches} extract batches.`
        : undefined,
  };
}
