import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    $queryRaw: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@/lib/ai/ollama-client", () => ({
  getOllamaClient: vi.fn(),
  isOllamaConfigured: vi.fn(),
  getOllamaHostOnly: vi.fn((url: string) => url.replace(/^https?:\/\//, "")),
}));

import { GET } from "../route";
import { getOllamaClient, isOllamaConfigured } from "@/lib/ai/ollama-client";

describe("GET /api/health", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("includes ollama connected status when health check passes", async () => {
    process.env.DATABASE_URL = "postgresql://localhost/test";
    process.env.AUTH_SECRET = "secret";
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";

    vi.mocked(isOllamaConfigured).mockReturnValue(true);
    vi.mocked(getOllamaClient).mockReturnValue({
      healthCheck: vi.fn().mockResolvedValue({ ok: true, models: ["llama3"] }),
      getConfig: () => ({ baseUrl: "https://ollama.example.com", chatModel: "llama3", embedModel: "nomic-embed-text" }),
    } as never);

    const response = await GET();
    const json = (await response.json()) as {
      ok: boolean;
      ollama: string;
      ollamaUrl?: string;
    };

    expect(response.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.ollama).toBe("connected");
    expect(json.ollamaUrl).toBe("ollama.example.com");
  });

  it("reports not_configured when OLLAMA_BASE_URL is unset", async () => {
    process.env.DATABASE_URL = "postgresql://localhost/test";
    process.env.AUTH_SECRET = "secret";
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";

    vi.mocked(isOllamaConfigured).mockReturnValue(false);

    const response = await GET();
    const json = (await response.json()) as { ollama: string };

    expect(json.ollama).toBe("not_configured");
  });
});
