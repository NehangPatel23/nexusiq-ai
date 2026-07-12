import { Prisma } from "@prisma/client";

const DEFAULT_KEYWORD_MIN_RANK = 0.01;
const DEFAULT_SEMANTIC_MIN_SCORE = 0.48;

export function getKeywordMinRank(): number {
  const raw = process.env.SEARCH_KEYWORD_MIN_RANK;
  if (!raw) return DEFAULT_KEYWORD_MIN_RANK;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : DEFAULT_KEYWORD_MIN_RANK;
}

export function getSemanticMinScore(): number {
  const raw = process.env.SEARCH_SEMANTIC_MIN_SCORE;
  if (!raw) return DEFAULT_SEMANTIC_MIN_SCORE;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 && value <= 1
    ? value
    : DEFAULT_SEMANTIC_MIN_SCORE;
}

/** Prefer websearch_to_tsquery for phrases/quotes; fall back to plainto_tsquery. */
export function buildTsQuerySql(query: string): Prisma.Sql {
  return Prisma.sql`COALESCE(
    NULLIF(websearch_to_tsquery('english', ${query})::text, '')::tsquery,
    plainto_tsquery('english', ${query})
  )`;
}

/** @deprecated Use getKeywordMinRank() — kept for tests referencing default. */
export const KEYWORD_MIN_RANK = DEFAULT_KEYWORD_MIN_RANK;

/** @deprecated Use getSemanticMinScore() — kept for tests referencing default. */
export const SEMANTIC_MIN_SCORE = DEFAULT_SEMANTIC_MIN_SCORE;
