import { describe, expect, it, vi } from "vitest";

import { retrieveForAgent } from "@/lib/ai/agents/retrieval";
import { OllamaUnavailableError, runAgent } from "@/lib/ai/agents/run-agent";

vi.mock("@/lib/ai/agents/retrieval", () => ({ retrieveForAgent: vi.fn() }));

const sampleChunk = {
  chunkId: "chunk-1",
  documentId: "doc-1",
  documentName: "Financials.pdf",
  documentType: "PDF" as const,
  classification: "FINANCIAL" as const,
  folderId: null,
  content: "Revenue grew 12% year over year.",
  snippet: "Revenue grew 12%",
  score: 0.9,
  pageNumber: 1,
  sectionTitle: "Summary",
  mode: "hybrid" as const,
};

const validFinancialJson = JSON.stringify({
  financialHealthScore: 78,
  recommendation: "Continue monitoring margins.",
  confidence: "HIGH",
  anomalies: [
    {
      title: "Margin pressure",
      description: "Operating margin compressed.",
      severity: "MEDIUM",
      sourceChunkId: "chunk-1",
      documentId: "doc-1",
    },
  ],
});

const invalidFinancialJson = JSON.stringify({
  financialHealthScore: "not-a-number",
  recommendation: "Bad",
  confidence: "HIGH",
});

describe("runAgent validation retry", () => {
  it("retries once with a corrective prompt when the first JSON fails validation", async () => {
    const chat = vi
      .fn()
      .mockResolvedValueOnce(invalidFinancialJson)
      .mockResolvedValueOnce(validFinancialJson);
    const mockOllama = {
      healthCheck: vi.fn().mockResolvedValue({ ok: true, models: ["llama3"] }),
      chat,
    };

    vi.mocked(retrieveForAgent).mockResolvedValue({
      results: [sampleChunk],
      meta: { tookMs: 5, mode: "hybrid", ollamaUsed: true, uniqueDocuments: 1 },
    });

    const result = await runAgent("project-1", "FINANCIAL", {
      retrieve: retrieveForAgent,
      ollama: mockOllama,
    });

    expect(chat).toHaveBeenCalledTimes(2);
    expect(chat.mock.calls[1]?.[0]).toHaveLength(4);
    expect(chat.mock.calls[1]?.[0][2]?.role).toBe("assistant");
    expect(chat.mock.calls[1]?.[0][3]?.content).toMatch(/did not match the required FINANCIAL agent schema/i);
    expect(result.score).toBe(78);
    expect(result.confidence).toBe("HIGH");
  });

  it("fails after a second invalid response", async () => {
    const chat = vi.fn().mockResolvedValue(invalidFinancialJson);
    const mockOllama = {
      healthCheck: vi.fn().mockResolvedValue({ ok: true, models: ["llama3"] }),
      chat,
    };

    vi.mocked(retrieveForAgent).mockResolvedValue({
      results: [sampleChunk],
      meta: { tookMs: 5, mode: "hybrid", ollamaUsed: true, uniqueDocuments: 1 },
    });

    await expect(
      runAgent("project-1", "FINANCIAL", {
        retrieve: retrieveForAgent,
        ollama: mockOllama,
      }),
    ).rejects.toThrow(/validation failed after retry/i);

    expect(chat).toHaveBeenCalledTimes(2);
  });

  it("does not retry when ollama chat fails", async () => {
    const chat = vi.fn().mockRejectedValue(new Error("network down"));
    const mockOllama = {
      healthCheck: vi.fn().mockResolvedValue({ ok: true, models: ["llama3"] }),
      chat,
    };

    vi.mocked(retrieveForAgent).mockResolvedValue({
      results: [sampleChunk],
      meta: { tookMs: 5, mode: "hybrid", ollamaUsed: true, uniqueDocuments: 1 },
    });

    await expect(
      runAgent("project-1", "FINANCIAL", {
        retrieve: retrieveForAgent,
        ollama: mockOllama,
      }),
    ).rejects.toBeInstanceOf(OllamaUnavailableError);

    expect(chat).toHaveBeenCalledOnce();
  });
});
