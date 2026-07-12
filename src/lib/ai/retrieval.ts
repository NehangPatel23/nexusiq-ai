import { Prisma } from "@prisma/client";

import type { SearchFilters, SearchMeta, SearchMode, SearchResponse, SearchResultItem } from "@/features/search/lib/types";
import { prisma } from "@/lib/db";

import { embedTexts, formatVectorLiteral } from "./embeddings";
import { getOllamaClient, isOllamaConfigured } from "./ollama-client";
import {
  buildTsQuerySql,
  getKeywordMinRank,
  getSemanticMinScore,
} from "./search-thresholds";

const RRF_K = 60;
const DEFAULT_LIMIT = 20;

const CANDIDATE_MULTIPLIER = 5;
const MAX_CANDIDATES = 100;

type RawSearchRow = {
  chunk_id: string;
  document_id: string;
  document_name: string;
  document_type: string;
  classification: string | null;
  folder_id: string | null;
  content: string;
  snippet: string | null;
  score: number;
  page_number: number | null;
  section_title: string | null;
};

export { buildTsQuerySql, getKeywordMinRank, getSemanticMinScore } from "./search-thresholds";
export { KEYWORD_MIN_RANK, SEMANTIC_MIN_SCORE } from "./search-thresholds";

export type SearchInput = {
  projectId: string;
  query: string;
  mode?: SearchMode;
  filters?: SearchFilters;
  limit?: number;
};

function candidateLimit(limit: number) {
  return Math.min(limit * CANDIDATE_MULTIPLIER, MAX_CANDIDATES);
}

/** Keep the single best-scoring chunk per document. */
export function deduplicateByDocument<T extends { documentId: string; score: number }>(
  items: T[],
): T[] {
  const bestByDoc = new Map<string, T>();
  for (const item of items) {
    const existing = bestByDoc.get(item.documentId);
    if (!existing || item.score > existing.score) {
      bestByDoc.set(item.documentId, item);
    }
  }
  return Array.from(bestByDoc.values()).sort((a, b) => b.score - a.score);
}

function finalizeResults(items: SearchResultItem[], limit: number): SearchResultItem[] {
  return deduplicateByDocument(items).slice(0, limit);
}

export function reciprocalRankFusion(
  rankedLists: Array<Array<{ id: string; data: Omit<SearchResultItem, "score" | "mode"> }>>,
  k = RRF_K,
): Array<{ id: string; score: number; data: Omit<SearchResultItem, "score" | "mode"> }> {
  const scores = new Map<string, { score: number; data: Omit<SearchResultItem, "score" | "mode"> }>();

  for (const list of rankedLists) {
    list.forEach((item, index) => {
      const rank = index + 1;
      const contribution = 1 / (k + rank);
      const existing = scores.get(item.id);
      if (existing) {
        existing.score += contribution;
      } else {
        scores.set(item.id, { score: contribution, data: item.data });
      }
    });
  }

  return Array.from(scores.entries())
    .map(([id, value]) => ({ id, score: value.score, data: value.data }))
    .sort((a, b) => b.score - a.score);
}

export function buildFilterConditions(filters: SearchFilters = {}): Prisma.Sql[] {
  const conditions: Prisma.Sql[] = [
    Prisma.sql`d.deleted_at IS NULL`,
    Prisma.sql`d.status = 'READY'::"DocumentStatus"`,
  ];

  if (filters.type) {
    conditions.push(Prisma.sql`d.type = ${filters.type}::"DocumentType"`);
  }
  if (filters.classification) {
    conditions.push(Prisma.sql`d.classification = ${filters.classification}::"DocumentClassification"`);
  }
  if (filters.folderId) {
    conditions.push(Prisma.sql`d.folder_id = ${filters.folderId}`);
  }
  if (filters.tags && filters.tags.length > 0) {
    conditions.push(Prisma.sql`d.tags && ${filters.tags}::text[]`);
  }
  if (filters.dateFrom) {
    conditions.push(Prisma.sql`d.created_at >= ${new Date(filters.dateFrom)}`);
  }
  if (filters.dateTo) {
    conditions.push(Prisma.sql`d.created_at <= ${new Date(filters.dateTo)}`);
  }

  return conditions;
}

export function highlightSnippet(content: string, query: string): string {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.replace(/[^\w]/g, ""))
    .filter((term) => term.length > 2);

  if (terms.length === 0) {
    return content.length > 240 ? `${content.slice(0, 240)}…` : content;
  }

  const lower = content.toLowerCase();
  let bestIndex = -1;
  for (const term of terms) {
    const idx = lower.indexOf(term);
    if (idx >= 0 && (bestIndex < 0 || idx < bestIndex)) {
      bestIndex = idx;
    }
  }

  const start = bestIndex >= 0 ? Math.max(0, bestIndex - 60) : 0;
  const excerpt = content.slice(start, start + 240);
  const prefix = start > 0 ? "…" : "";
  const suffix = start + 240 < content.length ? "…" : "";

  let highlighted = excerpt;
  for (const term of terms) {
    const regex = new RegExp(`(${escapeRegex(term)})`, "gi");
    highlighted = highlighted.replace(regex, "<mark>$1</mark>");
  }

  return `${prefix}${highlighted}${suffix}`;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function mapRow(row: RawSearchRow, mode: SearchMode, query: string): SearchResultItem {
  return {
    chunkId: row.chunk_id,
    documentId: row.document_id,
    documentName: row.document_name,
    documentType: row.document_type as SearchResultItem["documentType"],
    classification: row.classification as SearchResultItem["classification"],
    folderId: row.folder_id,
    content: row.content,
    snippet: row.snippet?.trim() || highlightSnippet(row.content, query),
    score: Number(row.score),
    pageNumber: row.page_number,
    sectionTitle: row.section_title,
    mode,
  };
}

async function keywordSearch(
  projectId: string,
  query: string,
  filters: SearchFilters,
  limit: number,
): Promise<SearchResultItem[]> {
  const filterSql = Prisma.join(buildFilterConditions(filters), " AND ");
  const tsQuery = buildTsQuerySql(query);
  const keywordMinRank = getKeywordMinRank();

  const rows = await prisma.$queryRaw<RawSearchRow[]>`
    SELECT
      dc.id AS chunk_id,
      dc.content,
      dc.page_number,
      dc.section_title,
      d.id AS document_id,
      d.name AS document_name,
      d.type::text AS document_type,
      d.classification::text AS classification,
      d.folder_id,
      ts_rank(dc.search_vector, ${tsQuery})::float8 AS score,
      ts_headline(
        'english',
        dc.content,
        ${tsQuery},
        'MaxWords=40, MinWords=12, StartSel=<mark>, StopSel=</mark>'
      ) AS snippet
    FROM document_chunks dc
    INNER JOIN documents d ON d.id = dc.document_id
    WHERE d.project_id = ${projectId}
      AND dc.search_vector @@ ${tsQuery}
      AND ts_rank(dc.search_vector, ${tsQuery}) >= ${keywordMinRank}
      AND ${filterSql}
    ORDER BY score DESC
    LIMIT ${candidateLimit(limit)}
  `;

  return finalizeResults(rows.map((row) => mapRow(row, "keyword", query)), limit);
}

async function semanticSearch(
  projectId: string,
  query: string,
  queryVector: number[],
  filters: SearchFilters,
  limit: number,
): Promise<SearchResultItem[]> {
  const filterSql = Prisma.join(buildFilterConditions(filters), " AND ");
  const vectorLiteral = formatVectorLiteral(queryVector);
  const semanticMinScore = getSemanticMinScore();

  const rows = await prisma.$queryRaw<RawSearchRow[]>`
    SELECT
      dc.id AS chunk_id,
      dc.content,
      dc.page_number,
      dc.section_title,
      d.id AS document_id,
      d.name AS document_name,
      d.type::text AS document_type,
      d.classification::text AS classification,
      d.folder_id,
      (1 - (dc.embedding <=> ${vectorLiteral}::vector))::float8 AS score,
      NULL::text AS snippet
    FROM document_chunks dc
    INNER JOIN documents d ON d.id = dc.document_id
    WHERE d.project_id = ${projectId}
      AND dc.embedding IS NOT NULL
      AND (1 - (dc.embedding <=> ${vectorLiteral}::vector)) >= ${semanticMinScore}
      AND ${filterSql}
    ORDER BY dc.embedding <=> ${vectorLiteral}::vector
    LIMIT ${candidateLimit(limit)}
  `;

  return finalizeResults(rows.map((row) => mapRow(row, "semantic", query)), limit);
}

function toFusionItem(row: SearchResultItem) {
  return {
    id: row.chunkId,
    data: {
      chunkId: row.chunkId,
      documentId: row.documentId,
      documentName: row.documentName,
      documentType: row.documentType,
      classification: row.classification,
      folderId: row.folderId,
      content: row.content,
      snippet: row.snippet,
      pageNumber: row.pageNumber,
      sectionTitle: row.sectionTitle,
    },
  };
}

function buildMeta(
  results: SearchResultItem[],
  partial: Omit<SearchMeta, "uniqueDocuments">,
): SearchMeta {
  return {
    ...partial,
    uniqueDocuments: results.length,
  };
}

export type RagRetrievalOptions = {
  mode?: SearchMode;
  filters?: SearchFilters;
  limit?: number;
};

/** Thin wrapper for Slice 08 chat RAG — defaults to hybrid, top 10 chunks. */
export async function retrieveForRag(
  projectId: string,
  query: string,
  options?: RagRetrievalOptions,
): Promise<SearchResponse> {
  return searchDocuments({
    projectId,
    query,
    mode: options?.mode ?? "hybrid",
    filters: options?.filters,
    limit: options?.limit ?? 10,
  });
}

export async function searchDocuments(input: SearchInput): Promise<SearchResponse> {
  const started = Date.now();
  const mode = input.mode ?? "hybrid";
  const filters = input.filters ?? {};
  const limit = Math.min(input.limit ?? DEFAULT_LIMIT, 50);
  const query = input.query.trim();

  if (!query) {
    throw new Error("Search query is required");
  }

  if (mode === "keyword") {
    const results = await keywordSearch(input.projectId, query, filters, limit);
    return {
      results,
      meta: buildMeta(results, {
        tookMs: Date.now() - started,
        mode: "keyword",
        ollamaUsed: false,
      }),
    };
  }

  let fallback = false;
  let fallbackMessage: string | undefined;
  let effectiveMode: SearchMode = mode;

  let queryVector: number[] | null = null;
  if (isOllamaConfigured()) {
    try {
      const embeddings = await embedTexts([query], getOllamaClient());
      queryVector = embeddings[0] ?? null;
    } catch {
      queryVector = null;
    }
  }

  if (!queryVector || queryVector.length === 0) {
    if (mode === "semantic") {
      throw new Error("Semantic search unavailable — Ollama is not reachable");
    }
    fallback = true;
    fallbackMessage = "Semantic search unavailable — showing keyword results";
    effectiveMode = "keyword";
    const results = await keywordSearch(input.projectId, query, filters, limit);
    return {
      results,
      meta: buildMeta(results, {
        tookMs: Date.now() - started,
        mode: effectiveMode,
        ollamaUsed: false,
        fallback,
        fallbackMessage,
      }),
    };
  }

  if (mode === "semantic") {
    const results = await semanticSearch(input.projectId, query, queryVector, filters, limit);
    return {
      results,
      meta: buildMeta(results, {
        tookMs: Date.now() - started,
        mode: "semantic",
        ollamaUsed: true,
      }),
    };
  }

  const [keywordResults, semanticResults] = await Promise.all([
    keywordSearch(input.projectId, query, filters, limit),
    semanticSearch(input.projectId, query, queryVector, filters, limit),
  ]);

  const fused = reciprocalRankFusion([
    keywordResults.map(toFusionItem),
    semanticResults.map(toFusionItem),
  ]);

  const hybridItems: SearchResultItem[] = fused.map((item) => ({
    ...item.data,
    score: item.score,
    mode: "hybrid" as const,
    snippet: item.data.snippet || highlightSnippet(item.data.content, query),
  }));

  const results = finalizeResults(hybridItems, limit);

  return {
    results,
    meta: buildMeta(results, {
      tookMs: Date.now() - started,
      mode: "hybrid",
      ollamaUsed: true,
    }),
  };
}
