import type { SearchResponse, SearchResultItem } from "@/features/search/lib/types";
import { describe, expect, it, vi } from "vitest";

import { formatSseEvent } from "@/features/chat/lib/sse";
import { normalizeAssistantMarkdown } from "@/features/chat/lib/normalize-markdown";
import { parseAndValidateCitations, stripCitationMarkers } from "@/lib/ai/citations";
import { parseConfidence, stripConfidenceMarker } from "@/lib/ai/confidence";
import {
  INSUFFICIENT_EVIDENCE_MESSAGE,
  OllamaUnavailableError,
  runRagChat,
} from "@/lib/ai/chat/rag-chat";
import { buildChatSystemPrompt } from "@/lib/ai/chat/prompts";

const chunk: SearchResultItem = {
  chunkId: "chunk-1",
  documentId: "doc-1",
  documentName: "Contract.pdf",
  documentType: "PDF",
  classification: "LEGAL",
  folderId: null,
  content: "The agreement expires on December 31, 2027.",
  snippet: "The agreement expires on December 31, 2027.",
  score: 0.9,
  pageNumber: 4,
  sectionTitle: "Term",
  mode: "hybrid",
};

function response(results: SearchResultItem[]): SearchResponse {
  return {
    results,
    meta: { tookMs: 2, mode: "hybrid", ollamaUsed: true, uniqueDocuments: results.length },
  };
}

describe("chat AI utilities", () => {
  it("parses, validates, and deduplicates citations", () => {
    const citations = parseAndValidateCitations(
      "Fact [doc:doc-1:chunk:chunk-1]. Repeat [doc:doc-1:chunk:chunk-1]. Invalid [doc:x:chunk:y].",
      [chunk],
    );
    expect(citations).toEqual([
      expect.objectContaining({
        documentId: "doc-1",
        chunkId: "chunk-1",
        documentName: "Contract.pdf",
      }),
    ]);
  });

  it("maps Source N references to retrieved chunks", () => {
    const secondChunk: SearchResultItem = {
      ...chunk,
      chunkId: "chunk-2",
      documentId: "doc-2",
      documentName: "MSA.txt",
      content: "Renewal date is February 28, 2025.",
    };
    const citations = parseAndValidateCitations(
      "The AWS agreement expires on Feb 28, 2025 (Source 2).",
      [chunk, secondChunk],
    );
    expect(citations).toEqual([
      expect.objectContaining({
        documentId: "doc-2",
        chunkId: "chunk-2",
        documentName: "MSA.txt",
      }),
    ]);
  });

  it("infers citations when the model names retrieved documents", async () => {
    const { normalizeImplicitCitations } = await import("@/lib/ai/citations");
    const msaChunk: SearchResultItem = {
      ...chunk,
      chunkId: "chunk-msa",
      documentId: "doc-msa",
      documentName: "Vendor-MSA-CloudHost-Excerpt.pdf",
      content: "Either party may terminate for convenience with 90 days notice.",
    };
    const summaryChunk: SearchResultItem = {
      ...chunk,
      chunkId: "chunk-summary",
      documentId: "doc-summary",
      documentName: "Material-Contracts-Summary.txt",
      content: `HELIX ANALYTICS, INC. — MATERIAL CONTRACTS SUMMARY
2. Meridian Financial Group — Master Subscription Agreement
   Most-favored-nation clause on pricing for comparable enterprise tier
3. CEO Employment Agreement — David Chen
   Change-of-control severance: 2x base + bonus + 18 months benefits`,
    };
    const raw =
      "Master Services Agreement excerpt from **Vendor-MSA-CloudHost-Excerpt.pdf**.\n" +
      "Reseller Agreement excerpt from **Material-Contracts-Summary.txt**.\n" +
      "CONFIDENCE: MEDIUM";

    const citations = parseAndValidateCitations(raw, [msaChunk, summaryChunk]);
    expect(citations).toHaveLength(2);
    expect(citations.map((item) => item.documentName)).toEqual([
      "Vendor-MSA-CloudHost-Excerpt.pdf",
      "Material-Contracts-Summary.txt",
    ]);

    const normalized = normalizeImplicitCitations(raw, [msaChunk, summaryChunk]);
    expect(normalized).toContain("(Source 1)");
    expect(normalized).toContain("(Source 2)");

    const confidence = parseConfidence(normalized, citations, { retrievalCount: 10 });
    expect(confidence.confidence).toBe("MEDIUM");
    expect(confidence.reason).toBeUndefined();
  });

  it("infers citations from contract titles rather than filenames", async () => {
    const summaryChunk: SearchResultItem = {
      ...chunk,
      chunkId: "chunk-summary",
      documentId: "doc-summary",
      documentName: "Material-Contracts-Summary.txt",
      content: `2. Meridian Financial Group — Master Subscription Agreement
   Most-favored-nation clause on pricing for comparable enterprise tier
3. CEO Employment Agreement — David Chen
   Change-of-control severance: 2x base + bonus + 18 months benefits`,
    };
    const employmentChunk: SearchResultItem = {
      ...chunk,
      chunkId: "chunk-ceo",
      documentId: "doc-ceo",
      documentName: "Employment-Agreement-CEO-Excerpt.txt",
      content: `EMPLOYMENT AGREEMENT EXCERPT
Section 9 — Change in Control
Upon a Change in Control, cash severance equal to 2.0x (Base Salary + Target Bonus)`,
    };
    const raw =
      "The most-favored-nation clause is present in the Master Subscription Agreement. " +
      "Change-of-control severance is provided to the CEO.\nCONFIDENCE: MEDIUM";

    const citations = parseAndValidateCitations(raw, [summaryChunk, employmentChunk]);
    expect(citations.length).toBeGreaterThanOrEqual(1);
    expect(citations.some((item) => item.documentName === "Material-Contracts-Summary.txt")).toBe(
      true,
    );

    const confidence = parseConfidence(raw, citations, { retrievalCount: 10 });
    expect(confidence.confidence).not.toBe("INSUFFICIENT");
    expect(confidence.score).toBeGreaterThan(18);
  });

  it("parses confidence and removes the trailing marker", () => {
    const result = parseConfidence("Supported answer.\nCONFIDENCE: HIGH", [
      {
        documentId: "doc-1",
        chunkId: "chunk-1",
        documentName: "Contract.pdf",
        excerpt: "The agreement expires on December 31, 2027.",
      },
    ]);
    expect(result.content).toBe("Supported answer.");
    expect(result.confidence).toBe("HIGH");
    expect(result.score).toBeGreaterThan(0);
  });

  it("strips inline confidence markers from answer text", () => {
    expect(stripConfidenceMarker("Answer body. CONFIDENCE: MEDIUM")).toBe("Answer body.");
  });

  it("preserves markdown line breaks when stripping citations", () => {
    const content = "Intro line\n| Rank | Customer |\n| --- | --- |\n| 1 | Acme |";
    expect(stripCitationMarkers(content)).toBe(content);
  });

  it("downgrades uncited factual output to insufficient", () => {
    const result = parseConfidence("Unsupported answer.\nCONFIDENCE: HIGH", [], {
      retrievalCount: 8,
    });
    expect(result.confidence).toBe("INSUFFICIENT");
    expect(result.reason).toContain("did not cite");
  });

  it("builds general and specialist prompts from prompt files", () => {
    expect(buildChatSystemPrompt("GENERAL")).toContain("general analyst");
    expect(buildChatSystemPrompt("LEGAL")).toContain("legal due diligence analyst");
    expect(buildChatSystemPrompt("LEGAL")).toContain("[doc:{documentId}:chunk:{chunkId}]");
  });

  it("formats SSE events", () => {
    expect(formatSseEvent("token", { delta: "hello" })).toBe(
      'event: token\ndata: {"delta":"hello"}\n\n',
    );
  });

  it("inserts spacing around markdown tables", () => {
    const input = "Top customers are:\n| Rank | Customer |\n| --- | --- |\n| 1 | Acme |\nSummary line";
    expect(normalizeAssistantMarkdown(input)).toBe(
      "Top customers are:\n\n| Rank | Customer |\n| --- | --- |\n| 1 | Acme |\n\nSummary line",
    );
  });

  it("builds readable chat titles", async () => {
    const { buildChatTitle } = await import("@/features/chat/lib/chat-title");
    expect(buildChatTitle("what is customer concentration?")).toBe(
      "What is customer concentration?",
    );
    expect(buildChatTitle("a".repeat(100)).endsWith("…")).toBe(true);
  });

  it("strips uncited factual sentences", async () => {
    const { stripUncitedFactualSentences } = await import("@/lib/ai/uncited-sentences");
    const input =
      "Revenue is $38.3M with no citation. Supported fact (Source 1).";
    expect(stripUncitedFactualSentences(input)).not.toContain("$38.3M");
    expect(stripUncitedFactualSentences(input)).toContain("Supported fact");
  });
});

describe("runRagChat", () => {
  it("streams a cited answer and returns validated output", async () => {
    const onToken = vi.fn();
    const retrieve = vi.fn(async () => response([chunk]));
    const chatStream = vi.fn(async (_messages, token: (delta: string) => void) => {
      token("Answer ");
      token("[doc:doc-1:chunk:chunk-1]\nCONFIDENCE: HIGH");
      return "Answer [doc:doc-1:chunk:chunk-1]\nCONFIDENCE: HIGH";
    });

    const result = await runRagChat({
      projectId: "project-1",
      userMessage: "When does it expire?",
      agentType: "LEGAL",
      onToken,
      dependencies: {
        retrieve,
        ollama: {
          healthCheck: vi.fn(async () => ({ ok: true as const, models: ["llama3"] })),
          chatStream,
        },
      },
    });

    expect(onToken).toHaveBeenCalledTimes(2);
    expect(result.confidence).toBe("HIGH");
    expect(result.confidenceScore).toBeGreaterThan(0);
    expect(result.citations).toHaveLength(1);
    expect(result.content).not.toContain("CONFIDENCE:");
  });

  it("accepts Source N citations from the model", async () => {
    const retrieve = vi.fn(async () => response([chunk]));
    const chatStream = vi.fn(async () => "Renewal is Dec 31, 2027 (Source 1).\nCONFIDENCE: MEDIUM");

    const result = await runRagChat({
      projectId: "project-1",
      userMessage: "When does it expire?",
      agentType: "LEGAL",
      onToken: vi.fn(),
      dependencies: {
        retrieve,
        ollama: {
          healthCheck: vi.fn(async () => ({ ok: true as const, models: ["llama3"] })),
          chatStream,
        },
      },
    });

    expect(result.citations).toHaveLength(1);
    expect(result.confidence).toBe("MEDIUM");
    expect(result.content).not.toContain("Source 1");
  });

  it("accepts document filename references when Source markers are missing", async () => {
    const retrieve = vi.fn(async () => response([chunk]));
    const chatStream = vi.fn(
      async () =>
        "Renewal terms are in **Contract.pdf** with a December 31, 2027 end date.\nCONFIDENCE: MEDIUM",
    );

    const result = await runRagChat({
      projectId: "project-1",
      userMessage: "When does it expire?",
      agentType: "LEGAL",
      onToken: vi.fn(),
      dependencies: {
        retrieve,
        ollama: {
          healthCheck: vi.fn(async () => ({ ok: true as const, models: ["llama3"] })),
          chatStream,
        },
      },
    });

    expect(result.citations).toHaveLength(1);
    expect(result.confidence).toBe("MEDIUM");
    expect(result.confidenceReason).toBeUndefined();
    expect(result.content).not.toContain("Source 1");
  });

  it("returns insufficient evidence without calling Ollama", async () => {
    const healthCheck = vi.fn(async () => ({ ok: true as const, models: [] }));
    const chatStream = vi.fn();
    const result = await runRagChat({
      projectId: "project-1",
      userMessage: "Unknown fact?",
      agentType: "GENERAL",
      onToken: vi.fn(),
      dependencies: {
        retrieve: vi.fn(async () => response([])),
        ollama: { healthCheck, chatStream },
      },
    });

    expect(result.content).toBe(INSUFFICIENT_EVIDENCE_MESSAGE);
    expect(result.confidence).toBe("INSUFFICIENT");
    expect(healthCheck).not.toHaveBeenCalled();
    expect(chatStream).not.toHaveBeenCalled();
  });

  it("reports Ollama unavailable before generation", async () => {
    await expect(
      runRagChat({
        projectId: "project-1",
        userMessage: "Question",
        agentType: "GENERAL",
        onToken: vi.fn(),
        dependencies: {
          retrieve: vi.fn(async () => response([chunk])),
          ollama: {
            healthCheck: vi.fn(async () => ({ ok: false as const, error: "offline" })),
            chatStream: vi.fn(),
          },
        },
      }),
    ).rejects.toBeInstanceOf(OllamaUnavailableError);
  });

  it("retries retrieval in keyword mode after hybrid failure", async () => {
    const retrieve = vi
      .fn()
      .mockRejectedValueOnce(new Error("embedding failed"))
      .mockResolvedValueOnce(response([]));

    await runRagChat({
      projectId: "project-1",
      userMessage: "Question",
      agentType: "GENERAL",
      onToken: vi.fn(),
      dependencies: {
        retrieve,
        ollama: { healthCheck: vi.fn(), chatStream: vi.fn() },
      },
    });

    expect(retrieve).toHaveBeenNthCalledWith(
      2,
      "project-1",
      "Question",
      expect.objectContaining({ mode: "keyword" }),
    );
  });
});
