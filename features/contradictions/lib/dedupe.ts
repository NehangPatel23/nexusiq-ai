import type { ContradictionFactType, FindingSeverity } from "@prisma/client";

import { findValueMatch } from "@/features/contradictions/lib/excerpt-match";
import type { ExtractedContradiction } from "@/features/contradictions/schemas";

export type ContradictionCandidate = ExtractedContradiction;

function normalizeValue(value: string): string {
  return value
    .toLowerCase()
    .replace(/[$,]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function contradictionDedupeKey(row: {
  subject: string;
  factType: ContradictionFactType | string;
  valueA: string;
  valueB: string;
}): string {
  const a = normalizeValue(row.valueA);
  const b = normalizeValue(row.valueB);
  const [left, right] = a < b ? [a, b] : [b, a];
  return [
    normalizeValue(row.subject),
    String(row.factType).toUpperCase(),
    left,
    right,
  ].join("|");
}

export function isValidCrossDocumentContradiction(
  row: ContradictionCandidate,
  allowedChunks: Set<string>,
  allowedDocuments: Set<string>,
): boolean {
  if (row.documentAId === row.documentBId) return false;
  if (row.chunkAId === row.chunkBId) return false;
  if (normalizeValue(row.valueA) === normalizeValue(row.valueB)) return false;
  if (!allowedChunks.has(row.chunkAId) || !allowedChunks.has(row.chunkBId)) return false;
  if (!allowedDocuments.has(row.documentAId) || !allowedDocuments.has(row.documentBId)) {
    return false;
  }
  return true;
}

export function validateChunkDocumentOwnership(
  row: ContradictionCandidate,
  chunkToDocument: Map<string, string>,
): boolean {
  const docA = chunkToDocument.get(row.chunkAId);
  const docB = chunkToDocument.get(row.chunkBId);
  if (!docA || !docB) return false;
  return docA === row.documentAId && docB === row.documentBId;
}

type ChunkEvidence = {
  chunkId: string;
  documentId: string;
  content: string;
};

/**
 * Ensure both cited values appear in the scan corpus for their documents.
 * Remaps chunk IDs when the model cited the wrong chunk but the value exists
 * elsewhere in the same document within the retrieved set.
 */
export function alignContradictionEvidence(
  row: ContradictionCandidate,
  chunks: ChunkEvidence[],
): ContradictionCandidate | null {
  const byDoc = new Map<string, ChunkEvidence[]>();
  for (const chunk of chunks) {
    const list = byDoc.get(chunk.documentId) ?? [];
    list.push(chunk);
    byDoc.set(chunk.documentId, list);
  }

  function resolve(
    documentId: string,
    preferredChunkId: string,
    value: string,
    factType: string,
  ): string | null {
    const preferred = chunks.find((c) => c.chunkId === preferredChunkId);
    if (
      preferred &&
      preferred.documentId === documentId &&
      findValueMatch(preferred.content, value, factType)
    ) {
      return preferred.chunkId;
    }
    const siblings = byDoc.get(documentId) ?? [];
    for (const sibling of siblings) {
      if (findValueMatch(sibling.content, value, factType)) {
        return sibling.chunkId;
      }
    }
    return null;
  }

  const chunkAId = resolve(row.documentAId, row.chunkAId, row.valueA, row.factType);
  const chunkBId = resolve(row.documentBId, row.chunkBId, row.valueB, row.factType);
  if (!chunkAId || !chunkBId) return null;
  if (chunkAId === chunkBId) return null;

  return { ...row, chunkAId, chunkBId };
}

export function severityRank(severity: FindingSeverity): number {
  switch (severity) {
    case "CRITICAL":
      return 0;
    case "HIGH":
      return 1;
    case "MEDIUM":
      return 2;
    case "LOW":
      return 3;
    default:
      return 4;
  }
}

export function dedupeContradictionCandidates(
  rows: ContradictionCandidate[],
): ContradictionCandidate[] {
  const seen = new Set<string>();
  const out: ContradictionCandidate[] = [];
  for (const row of rows) {
    const key = contradictionDedupeKey(row);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}
