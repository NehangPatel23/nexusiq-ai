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

  it("parses NDJSON chat streams and emits content deltas", async () => {
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        controller.enqueue(encoder.encode('{"message":{"content":"Hello"}}\n{"message":'));
        controller.enqueue(encoder.encode('{"content":" world"},"done":false}\n{"done":true}\n'));
        controller.close();
      },
    });
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(stream, { status: 200, headers: { "Content-Type": "application/x-ndjson" } }),
    );
    const client = new OllamaClient({
      config: {
        baseUrl: "https://ollama.example.com",
        chatModel: "llama3",
        embedModel: "nomic-embed-text",
        apiKey: "secret-key",
      },
      fetchImpl,
    });
    const onToken = vi.fn();

    const content = await client.chatStream(
      [{ role: "user", content: "Say hello" }],
      onToken,
      { maxTokens: 100 },
    );

    expect(content).toBe("Hello world");
    expect(onToken).toHaveBeenNthCalledWith(1, "Hello");
    expect(onToken).toHaveBeenNthCalledWith(2, " world");
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://ollama.example.com/api/chat",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer secret-key" }),
      }),
    );
  });

  it("getOllamaHostOnly strips path and hides secrets", () => {
    expect(getOllamaHostOnly("https://ollama.yourdomain.com/v1")).toBe(
      "ollama.yourdomain.com",
    );
  });

  it("chat throws OllamaTimeoutError when the request aborts on timeout", async () => {
    const { OllamaTimeoutError } = await import("../ollama-client");
    const fetchImpl = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        const signal = init?.signal;
        if (!signal) {
          reject(new Error("missing signal"));
          return;
        }
        signal.addEventListener("abort", () => {
          const error = new Error("aborted");
          error.name = "AbortError";
          reject(error);
        });
      });
    });

    const client = new OllamaClient({
      config: {
        baseUrl: "https://ollama.example.com",
        chatModel: "llama3",
        embedModel: "nomic-embed-text",
        chatTimeoutMs: 20,
      },
      fetchImpl,
    });

    await expect(client.chat([{ role: "user", content: "hi" }])).rejects.toBeInstanceOf(
      OllamaTimeoutError,
    );
  });
});
