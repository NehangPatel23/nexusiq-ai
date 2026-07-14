import { describe, expect, it } from "vitest";

import { classifyTimelineCategory } from "@/features/timeline/lib/category";
import { dedupeTimelineCandidates, isDuplicateTimelineEvent, titleSimilarity } from "@/features/timeline/lib/dedupe";
import { extractOfflineDateCandidates } from "@/features/timeline/lib/offline-dates";
import { extractedTimelinePayloadSchema } from "@/features/timeline/schemas";

describe("classifyTimelineCategory", () => {
  it("maps funding keywords", () => {
    expect(classifyTimelineCategory("Closed Series B round")).toBe("FUNDING");
  });

  it("maps lawsuit keywords", () => {
    expect(classifyTimelineCategory("Plaintiff filed lawsuit")).toBe("LAWSUIT");
  });

  it("falls back to OTHER", () => {
    expect(classifyTimelineCategory("Routine update")).toBe("OTHER");
  });
});

describe("timeline dedupe", () => {
  it("detects same-day similar titles", () => {
    const a = {
      title: "Series A financing closed",
      eventDate: new Date("2024-03-01T12:00:00Z"),
      documentId: "doc-1",
    };
    const b = {
      title: "Series A financing closed announcement",
      eventDate: new Date("2024-03-01T18:00:00Z"),
      documentId: "doc-1",
    };
    expect(titleSimilarity(a.title, b.title)).toBeGreaterThan(0.7);
    expect(isDuplicateTimelineEvent(a, b)).toBe(true);
  });

  it("keeps distinct document events", () => {
    const a = {
      title: "Series A financing closed",
      eventDate: new Date("2024-03-01T12:00:00Z"),
      documentId: "doc-1",
    };
    const b = {
      title: "Series A financing closed",
      eventDate: new Date("2024-03-01T12:00:00Z"),
      documentId: "doc-2",
    };
    expect(isDuplicateTimelineEvent(a, b)).toBe(false);
  });

  it("dedupes candidate lists", () => {
    const result = dedupeTimelineCandidates([
      {
        title: "Hired VP Sales",
        eventDate: new Date("2023-01-01T00:00:00Z"),
        documentId: "d1",
      },
      {
        title: "Hired VP Sales",
        eventDate: new Date("2023-01-01T00:00:00Z"),
        documentId: "d1",
      },
    ]);
    expect(result).toHaveLength(1);
  });
});

describe("extractedTimelinePayloadSchema", () => {
  it("parses array payloads", () => {
    const parsed = extractedTimelinePayloadSchema.safeParse([
      {
        title: "IPO priced",
        description: "Company priced IPO",
        eventDate: "2024-06-01T00:00:00.000Z",
        sourceChunkId: "c1",
        documentId: "d1",
      },
    ]);
    expect(parsed.success).toBe(true);
  });
});

describe("extractOfflineDateCandidates", () => {
  it("extracts ISO dates with evidence lines", () => {
    const candidates = extractOfflineDateCandidates([
      {
        chunkId: "chunk-1",
        documentId: "doc-1",
        content: "On 2022-11-15 the company signed a major enterprise contract with Acme.",
      },
    ]);
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0]?.sourceChunkId).toBe("chunk-1");
    expect(candidates[0]?.eventDate.startsWith("2022-11-15")).toBe(true);
    expect(candidates[0]?.lowConfidence).toBe(true);
  });

  it("skips bare dates without surrounding evidence", () => {
    const candidates = extractOfflineDateCandidates([
      {
        chunkId: "chunk-2",
        documentId: "doc-2",
        content: "2022-11-15",
      },
    ]);
    expect(candidates).toHaveLength(0);
  });
});
