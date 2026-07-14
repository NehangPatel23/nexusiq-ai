const AMOUNT_RE =
  /(?:USD|US\$|\$|€|£)\s?\d{1,3}(?:,\d{3})*(?:\.\d+)?(?:\s*(?:million|billion|m|bn|k))?|\b\d+(?:\.\d+)?%\b/gi;
const ISO_DATE_RE =
  /\b(?:19|20)\d{2}[-/](?:0?[1-9]|1[0-2])[-/](?:0?[1-9]|[12]\d|3[01])\b|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+(?:19|20)\d{2}\b/gi;
const PARTY_RE =
  /\b(?:[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,3}\s+(?:Inc|LLC|Ltd|Corp|Corporation|Company|Partners|Capital)\.?)\b/g;

export type MinedFact = {
  factType: "DATE" | "AMOUNT" | "PARTY" | "OTHER";
  value: string;
  chunkId: string;
  documentId: string;
  documentName: string;
};

/**
 * Lightweight heuristic fact mining to bias contradiction prompts toward
 * comparable amounts, dates, and party names across documents.
 */
export function mineFactsFromChunks(
  chunks: Array<{
    chunkId: string;
    documentId: string;
    documentName: string;
    content: string;
  }>,
): MinedFact[] {
  const facts: MinedFact[] = [];
  for (const chunk of chunks) {
    const text = chunk.content.slice(0, 4000);
    for (const match of text.matchAll(AMOUNT_RE)) {
      const value = match[0]?.trim();
      if (value) {
        facts.push({
          factType: "AMOUNT",
          value,
          chunkId: chunk.chunkId,
          documentId: chunk.documentId,
          documentName: chunk.documentName,
        });
      }
    }
    for (const match of text.matchAll(ISO_DATE_RE)) {
      const value = match[0]?.trim();
      if (value) {
        facts.push({
          factType: "DATE",
          value,
          chunkId: chunk.chunkId,
          documentId: chunk.documentId,
          documentName: chunk.documentName,
        });
      }
    }
    for (const match of text.matchAll(PARTY_RE)) {
      const value = match[0]?.trim();
      if (value && value.length > 3) {
        facts.push({
          factType: "PARTY",
          value,
          chunkId: chunk.chunkId,
          documentId: chunk.documentId,
          documentName: chunk.documentName,
        });
      }
    }
  }
  return facts.slice(0, 80);
}

export function hasComparableCrossDocFacts(facts: MinedFact[]): boolean {
  const byType = new Map<string, Set<string>>();
  for (const fact of facts) {
    const docs = byType.get(fact.factType) ?? new Set<string>();
    docs.add(fact.documentId);
    byType.set(fact.factType, docs);
  }
  for (const docs of byType.values()) {
    if (docs.size >= 2) return true;
  }
  // If we have chunks from ≥2 docs even without mined pairs, still allow model compare.
  const allDocs = new Set(facts.map((f) => f.documentId));
  return allDocs.size >= 2;
}
