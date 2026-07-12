import { describe, expect, it } from "vitest";

import {
  buildFilterConditions,
  deduplicateByDocument,
  highlightSnippet,
  reciprocalRankFusion,
  retrieveForRag,
} from "@/lib/ai/retrieval";

describe("reciprocalRankFusion", () => {
  it("merges ranked lists with RRF scoring", () => {
    const keyword = [
      { id: "a", data: { chunkId: "a", documentId: "d1", documentName: "A", content: "alpha" } as never },
      { id: "b", data: { chunkId: "b", documentId: "d2", documentName: "B", content: "beta" } as never },
    ];
    const semantic = [
      { id: "b", data: { chunkId: "b", documentId: "d2", documentName: "B", content: "beta" } as never },
      { id: "c", data: { chunkId: "c", documentId: "d3", documentName: "C", content: "gamma" } as never },
    ];

    const fused = reciprocalRankFusion([keyword, semantic], 60);

    expect(fused[0]?.id).toBe("b");
    expect(fused.map((item) => item.id)).toEqual(expect.arrayContaining(["a", "b", "c"]));
    expect(fused[0]?.score).toBeGreaterThan(fused[1]?.score ?? 0);
  });

  it("returns empty array for empty input lists", () => {
    expect(reciprocalRankFusion([])).toEqual([]);
  });
});

describe("deduplicateByDocument", () => {
  it("keeps only the highest-scoring chunk per document", () => {
    const items = [
      { documentId: "d1", chunkId: "c1", score: 0.9 },
      { documentId: "d1", chunkId: "c2", score: 0.5 },
      { documentId: "d2", chunkId: "c3", score: 0.7 },
    ];

    const deduped = deduplicateByDocument(items);

    expect(deduped).toHaveLength(2);
    expect(deduped[0]?.documentId).toBe("d1");
    expect(deduped[0]?.chunkId).toBe("c1");
    expect(deduped[1]?.documentId).toBe("d2");
  });

  it("returns empty array for no items", () => {
    expect(deduplicateByDocument([])).toEqual([]);
  });
});

describe("retrieveForRag", () => {
  it("is exported as a function", () => {
    expect(typeof retrieveForRag).toBe("function");
  });
});

describe("buildFilterConditions", () => {
  it("always includes deleted and ready constraints", () => {
    const conditions = buildFilterConditions({});
    expect(conditions.length).toBeGreaterThanOrEqual(2);
  });

  it("adds optional filter clauses", () => {
    const conditions = buildFilterConditions({
      type: "PDF",
      classification: "LEGAL",
      folderId: "11111111-1111-1111-1111-111111111111",
      tags: ["contract"],
      dateFrom: "2024-01-01T00:00:00.000Z",
      dateTo: "2024-12-31T23:59:59.999Z",
    });
    expect(conditions.length).toBe(8);
  });
});

describe("highlightSnippet", () => {
  it("wraps matching terms in mark tags", () => {
    const snippet = highlightSnippet("Annual revenue grew significantly in Q4", "revenue growth");
    expect(snippet).toContain("<mark>revenue</mark>");
  });

  it("returns truncated content when no terms match", () => {
    const long = "a".repeat(300);
    const snippet = highlightSnippet(long, "zz");
    expect(snippet.endsWith("…")).toBe(true);
  });
});
