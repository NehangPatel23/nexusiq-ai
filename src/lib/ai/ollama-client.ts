import {
  resolveEffectiveOllamaConfig,
  toOllamaClientConfig,
} from "@/features/settings/lib/ollama-config";
import { getOllamaSettingsOverlay } from "@/features/settings/lib/ollama-runtime";

export type OllamaConfig = {
  baseUrl: string;
  chatModel: string;
  embedModel: string;
  apiKey?: string;
  healthTimeoutMs?: number;
  chatTimeoutMs?: number;
};

export class OllamaTimeoutError extends Error {
  readonly code = "OLLAMA_TIMEOUT";

  constructor(message = "Ollama chat timed out before completing.") {
    super(message);
    this.name = "OllamaTimeoutError";
  }
}

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

export type OllamaChatOptions = {
  model?: string;
  format?: "json";
  maxTokens?: number;
  signal?: AbortSignal;
  timeoutMs?: number;
};

function readConfig(): OllamaConfig {
  const effective = resolveEffectiveOllamaConfig(getOllamaSettingsOverlay() ?? {});
  const client = toOllamaClientConfig(effective);
  const chatTimeoutFromEnv = Number(process.env.OLLAMA_CHAT_TIMEOUT_MS);
  return {
    ...client,
    healthTimeoutMs: 2000,
    chatTimeoutMs:
      Number.isFinite(chatTimeoutFromEnv) && chatTimeoutFromEnv > 0
        ? chatTimeoutFromEnv
        : undefined,
  };
}

function mergeAbortSignals(signals: Array<AbortSignal | undefined>): {
  signal?: AbortSignal;
  cleanup: () => void;
} {
  const active = signals.filter((signal): signal is AbortSignal => Boolean(signal));
  if (active.length === 0) return { cleanup: () => undefined };
  if (active.length === 1) return { signal: active[0], cleanup: () => undefined };

  const controller = new AbortController();
  const onAbort = () => {
    if (!controller.signal.aborted) controller.abort();
  };
  for (const signal of active) {
    if (signal.aborted) {
      controller.abort();
      break;
    }
    signal.addEventListener("abort", onAbort, { once: true });
  }
  return {
    signal: controller.signal,
    cleanup: () => {
      for (const signal of active) signal.removeEventListener("abort", onAbort);
    },
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
  if (process.env.OLLAMA_BASE_URL?.trim()) return true;
  const overlay = getOllamaSettingsOverlay()?.baseUrl;
  return Boolean(typeof overlay === "string" && overlay.trim());
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
    const timeout = setTimeout(() => controller.abort(), this.config.healthTimeoutMs ?? 2000);

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

  private resolveChatTimeoutMs(options?: OllamaChatOptions): number {
    if (typeof options?.timeoutMs === "number" && options.timeoutMs > 0) {
      return options.timeoutMs;
    }
    if (typeof this.config.chatTimeoutMs === "number" && this.config.chatTimeoutMs > 0) {
      return this.config.chatTimeoutMs;
    }
    // Default under Pro agent maxDuration (300s); set OLLAMA_CHAT_TIMEOUT_MS=50000 on Hobby.
    return 280_000;
  }

  async chat(messages: ChatMessage[], options?: OllamaChatOptions): Promise<string> {
    if (!this.config.baseUrl) {
      throw new Error("OLLAMA_BASE_URL is not set");
    }

    const timeoutMs = this.resolveChatTimeoutMs(options);
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs);
    const { signal, cleanup } = mergeAbortSignals([options?.signal, timeoutController.signal]);

    try {
      const response = await this.fetchImpl(`${this.config.baseUrl}/api/chat`, {
        method: "POST",
        headers: buildHeaders(this.config.apiKey),
        body: JSON.stringify({
          model: options?.model ?? this.config.chatModel,
          messages,
          stream: false,
          ...(options?.format === "json" ? { format: "json" } : {}),
          ...(options?.maxTokens ? { options: { num_predict: options.maxTokens } } : {}),
        }),
        signal,
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`Ollama chat failed (${response.status}): ${body || response.statusText}`);
      }

      const data = (await response.json()) as OllamaChatResult;
      return data.message?.content ?? "";
    } catch (error) {
      if (
        (error instanceof Error && error.name === "AbortError") ||
        (timeoutController.signal.aborted && !options?.signal?.aborted)
      ) {
        throw new OllamaTimeoutError(`Ollama chat timed out after ${timeoutMs}ms.`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
      cleanup();
    }
  }

  async chatStream(
    messages: ChatMessage[],
    onToken: (delta: string) => void | Promise<void>,
    options?: OllamaChatOptions,
  ): Promise<string> {
    if (!this.config.baseUrl) {
      throw new Error("OLLAMA_BASE_URL is not set");
    }

    const timeoutMs = this.resolveChatTimeoutMs(options);
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs);
    const { signal, cleanup } = mergeAbortSignals([options?.signal, timeoutController.signal]);

    try {
      const response = await this.fetchImpl(`${this.config.baseUrl}/api/chat`, {
        method: "POST",
        headers: buildHeaders(this.config.apiKey),
        body: JSON.stringify({
          model: options?.model ?? this.config.chatModel,
          messages,
          stream: true,
          ...(options?.format === "json" ? { format: "json" } : {}),
          ...(options?.maxTokens ? { options: { num_predict: options.maxTokens } } : {}),
        }),
        signal,
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`Ollama chat failed (${response.status}): ${body || response.statusText}`);
      }
      if (!response.body) {
        throw new Error("Ollama chat stream returned no body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let content = "";

      const processLine = async (line: string) => {
        if (!line.trim()) return;
        const event = JSON.parse(line) as {
          message?: { content?: string };
          error?: string;
        };
        if (event.error) {
          throw new Error(`Ollama chat failed: ${event.error}`);
        }
        const delta = event.message?.content ?? "";
        if (delta) {
          content += delta;
          await onToken(delta);
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          await processLine(line);
        }
        if (done) break;
      }

      await processLine(buffer);
      return content;
    } catch (error) {
      if (
        (error instanceof Error && error.name === "AbortError") ||
        (timeoutController.signal.aborted && !options?.signal?.aborted)
      ) {
        throw new OllamaTimeoutError(`Ollama chat stream timed out after ${timeoutMs}ms.`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
      cleanup();
    }
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

export function healthCheck(): Promise<OllamaHealthResult> {
  return getOllamaClient().healthCheck();
}

export function __testables() {
  return { readConfig, buildHeaders, mergeAbortSignals };
}
