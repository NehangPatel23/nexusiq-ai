import { afterEach, describe, expect, it, vi } from "vitest";

import {
  OllamaClient,
  getOllamaHostOnly,
  resetOllamaClient,
} from "../ollama-client";

describe("ollama-client", () => {
  afterEach(() => {
    resetOllamaClient();
    vi.restoreAllMocks();
  });

  it("healthCheck returns connected when /api/tags succeeds", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ models: [{ name: "llama3" }] }),
    });

    const client = new OllamaClient({
      config: { baseUrl: "http://localhost:11434", chatModel: "llama3", embedModel: "nomic-embed-text" },
      fetchImpl,
    });

    const result = await client.healthCheck();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.models).toContain("llama3");
    }
    expect(fetchImpl).toHaveBeenCalledWith(
      "http://localhost:11434/api/tags",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("sends Authorization header when API key is set", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ embedding: [0.1, 0.2] }),
    });

    const client = new OllamaClient({
      config: {
        baseUrl: "https://ollama.example.com",
        chatModel: "llama3",
        embedModel: "nomic-embed-text",
        apiKey: "secret-key",
      },
      fetchImpl,
    });

    await client.embed(["hello"]);
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://ollama.example.com/api/embeddings",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer secret-key",
        }),
      }),
    );
  });

  it("getOllamaHostOnly strips path and hides secrets", () => {
    expect(getOllamaHostOnly("https://ollama.yourdomain.com/v1")).toBe(
      "ollama.yourdomain.com",
    );
  });
});
