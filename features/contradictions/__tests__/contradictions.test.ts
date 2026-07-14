import { describe, expect, it } from "vitest";

import {
  alignContradictionEvidence,
  contradictionDedupeKey,
  dedupeContradictionCandidates,
  isValidCrossDocumentContradiction,
  validateChunkDocumentOwnership,
} from "@/features/contradictions/lib/dedupe";
import { extractedContradictionSchema } from "@/features/contradictions/schemas";
import { hasComparableCrossDocFacts, mineFactsFromChunks } from "@/features/contradictions/lib/fact-mining";

describe("contradiction validation", () => {
  const base = {
    subject: "Close date",
    factType: "DATE",
    valueA: "2024-01-15",
    valueB: "2024-03-01",
    documentAId: "11111111-1111-1111-1111-111111111111",
    chunkAId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    documentBId: "22222222-2222-2222-2222-222222222222",
    chunkBId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    explanation: "Docs disagree on closing date.",
    severity: "HIGH",
  } as const;

  it("parses extracted contradiction JSON", () => {
    const parsed = extractedContradictionSchema.safeParse(base);
    expect(parsed.success).toBe(true);
  });

  it("rejects same-document contradictions", () => {
    const allowedChunks = new Set([base.chunkAId, base.chunkBId]);
    const allowedDocs = new Set([base.documentAId, base.documentBId]);
    expect(
      isValidCrossDocumentContradiction(
        { ...base, documentBId: base.documentAId },
        allowedChunks,
        allowedDocs,
      ),
    ).toBe(false);
  });

  it("requires chunks in allowed set", () => {
    const allowedChunks = new Set([base.chunkAId]);
    const allowedDocs = new Set([base.documentAId, base.documentBId]);
    expect(isValidCrossDocumentContradiction(base, allowedChunks, allowedDocs)).toBe(false);
  });

  it("validates chunk ownership against documents", () => {
    const map = new Map([
      [base.chunkAId, base.documentAId],
      [base.chunkBId, base.documentBId],
    ]);
    expect(validateChunkDocumentOwnership(base, map)).toBe(true);
    expect(
      validateChunkDocumentOwnership(base, new Map([[base.chunkAId, base.documentBId]])),
    ).toBe(false);
  });

  it("dedupes by subject + factType + normalized values", () => {
    const rows = [
      base,
      { ...base, valueA: "$2024-01-15", valueB: "2024-03-01", explanation: "dup" },
      { ...base, subject: "Other", valueA: "A", valueB: "B" },
    ];
    const unique = dedupeContradictionCandidates(rows);
    expect(unique).toHaveLength(2);
    expect(contradictionDedupeKey(base)).toContain("close date");
  });

  it("aligns evidence to the chunk that actually contains the cited value", () => {
    const chunks = [
      { chunkId: base.chunkAId, documentId: base.documentAId, content: "Unrelated intro text." },
      {
        chunkId: "cccccccc-cccc-cccc-cccc-cccccccccccc",
        documentId: base.documentAId,
        content: "Closing date is January 15, 2024 per the term sheet.",
      },
      {
        chunkId: base.chunkBId,
        documentId: base.documentBId,
        content: "Closing date is March 1, 2024 per the SPA.",
      },
    ];

    const aligned = alignContradictionEvidence(base, chunks);
    expect(aligned).not.toBeNull();
    expect(aligned?.chunkAId).toBe("cccccccc-cccc-cccc-cccc-cccccccccccc");
    expect(aligned?.chunkBId).toBe(base.chunkBId);
  });

  it("rejects evidence when the cited value cannot be found in any sibling chunk", () => {
    const chunks = [
      { chunkId: base.chunkAId, documentId: base.documentAId, content: "No matching date here." },
      { chunkId: base.chunkBId, documentId: base.documentBId, content: "Also no matching date." },
    ];
    expect(alignContradictionEvidence(base, chunks)).toBeNull();
  });

  it("mines comparable cross-doc facts", () => {
    const facts = mineFactsFromChunks([
      {
        chunkId: "a",
        documentId: "d1",
        documentName: "a.pdf",
        content: "Purchase price $10,000,000 closing 2024-01-15 with Acme Corp.",
      },
      {
        chunkId: "b",
        documentId: "d2",
        documentName: "b.pdf",
        content: "Valuation $12,000,000 as of 2024-03-01 with Beta Capital Partners.",
      },
    ]);
    expect(facts.length).toBeGreaterThan(0);
    expect(hasComparableCrossDocFacts(facts)).toBe(true);
  });
});
