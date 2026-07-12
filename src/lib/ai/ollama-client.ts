export type OllamaConfig = {
  baseUrl: string;
  chatModel: string;
  embedModel: string;
  apiKey?: string;
  healthTimeoutMs?: number;
};

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type OllamaHealthResult =
  | { ok: true; models: string[] }
  | { ok: false; error: string };

export type OllamaChatResult = {
  message: { role: string; content: string };
};

export type OllamaEmbedResult = {
  embeddings: number[][];
};

function readConfig(): OllamaConfig {
  const baseUrl = (process.env.OLLAMA_BASE_URL ?? "").replace(/\/$/, "");
  return {
    baseUrl,
    chatModel: process.env.OLLAMA_CHAT_MODEL ?? "llama3",
    embedModel: process.env.OLLAMA_EMBED_MODEL ?? "nomic-embed-text",
    apiKey: process.env.OLLAMA_API_KEY,
    healthTimeoutMs: 5000,
  };
}

function buildHeaders(apiKey?: string): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }
  return headers;
}

export function getOllamaHostOnly(baseUrl: string): string {
  if (!baseUrl) return "";
  try {
    return new URL(baseUrl).host;
  } catch {
    return baseUrl.replace(/^https?:\/\//, "").split("/")[0] ?? baseUrl;
  }
}

export function isOllamaConfigured(): boolean {
  return Boolean(process.env.OLLAMA_BASE_URL?.trim());
}

export class OllamaClient {
  private config: OllamaConfig;
  private fetchImpl: typeof fetch;

  constructor(options?: { config?: Partial<OllamaConfig>; fetchImpl?: typeof fetch }) {
    this.config = { ...readConfig(), ...options?.config };
    this.fetchImpl = options?.fetchImpl ?? fetch;
  }

  getConfig(): OllamaConfig {
    return { ...this.config };
  }

  async healthCheck(): Promise<OllamaHealthResult> {
    if (!this.config.baseUrl) {
      return { ok: false, error: "OLLAMA_BASE_URL is not set" };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.healthTimeoutMs ?? 5000);

    try {
      const response = await this.fetchImpl(`${this.config.baseUrl}/api/tags`, {
        method: "GET",
        headers: buildHeaders(this.config.apiKey),
        signal: controller.signal,
      });

      if (!response.ok) {
        return { ok: false, error: `Ollama returned ${response.status}` };
      }

      const data = (await response.json()) as { models?: Array<{ name: string }> };
      const models = (data.models ?? []).map((m) => m.name);
      return { ok: true, models };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.name === "AbortError"
            ? "Ollama health check timed out"
            : error.message
          : "Ollama unreachable";
      return { ok: false, error: message };
    } finally {
      clearTimeout(timeout);
    }
  }

  async chat(messages: ChatMessage[], options?: { model?: string; format?: "json" }): Promise<string> {
    if (!this.config.baseUrl) {
      throw new Error("OLLAMA_BASE_URL is not set");
    }

    const response = await this.fetchImpl(`${this.config.baseUrl}/api/chat`, {
      method: "POST",
      headers: buildHeaders(this.config.apiKey),
      body: JSON.stringify({
        model: options?.model ?? this.config.chatModel,
        messages,
        stream: false,
        ...(options?.format === "json" ? { format: "json" } : {}),
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Ollama chat failed (${response.status}): ${body || response.statusText}`);
    }

    const data = (await response.json()) as OllamaChatResult;
    return data.message?.content ?? "";
  }

  async embed(texts: string[], options?: { model?: string }): Promise<number[][]> {
    if (!this.config.baseUrl) {
      throw new Error("OLLAMA_BASE_URL is not set");
    }
    if (texts.length === 0) return [];

    const model = options?.model ?? this.config.embedModel;
    const embeddings: number[][] = [];

    for (const text of texts) {
      const response = await this.fetchImpl(`${this.config.baseUrl}/api/embeddings`, {
        method: "POST",
        headers: buildHeaders(this.config.apiKey),
        body: JSON.stringify({ model, prompt: text }),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`Ollama embed failed (${response.status}): ${body || response.statusText}`);
      }

      const data = (await response.json()) as { embedding: number[] };
      embeddings.push(data.embedding);
    }

    return embeddings;
  }
}

let defaultClient: OllamaClient | null = null;

export function getOllamaClient(options?: { fetchImpl?: typeof fetch }): OllamaClient {
  if (!options?.fetchImpl && defaultClient) {
    return defaultClient;
  }
  const client = new OllamaClient(options);
  if (!options?.fetchImpl) {
    defaultClient = client;
  }
  return client;
}

/** Test helper — reset singleton between tests. */
export function resetOllamaClient() {
  defaultClient = null;
}

export function __testables() {
  return { readConfig, buildHeaders };
}
