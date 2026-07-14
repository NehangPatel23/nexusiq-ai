export const AI_SETTING_KEYS = {
  baseUrl: "ai.ollamaBaseUrl",
  chatModel: "ai.ollamaChatModel",
  embedModel: "ai.ollamaEmbedModel",
} as const;

export const DEFAULT_OLLAMA_BASE_URL = "http://localhost:11434";
export const DEFAULT_OLLAMA_CHAT_MODEL = "llama3";
export const DEFAULT_OLLAMA_EMBED_MODEL = "nomic-embed-text";

export type ConfigSource = "env" | "settings" | "default";

export type EffectiveOllamaField<T> = {
  value: T;
  source: ConfigSource;
};

export type EffectiveOllamaConfig = {
  baseUrl: EffectiveOllamaField<string>;
  chatModel: EffectiveOllamaField<string>;
  embedModel: EffectiveOllamaField<string>;
  /** API key is env-only; never returned to the client in full. */
  apiKeyConfigured: boolean;
  /**
   * Resolution rule: non-empty process.env always wins (production-safe on Vercel).
   * SystemSetting fills gaps for localhost convenience when env is unset.
   */
  resolutionRule: "env_wins";
};

export type OllamaSettingsValues = {
  baseUrl?: string | null;
  chatModel?: string | null;
  embedModel?: string | null;
};

function asString(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim().replace(/\/$/, "");
  if (value && typeof value === "object" && "value" in value) {
    const inner = (value as { value: unknown }).value;
    if (typeof inner === "string" && inner.trim()) return inner.trim().replace(/\/$/, "");
  }
  return null;
}

/**
 * Resolve effective Ollama config.
 * Env vars always override SystemSetting when set (non-empty).
 * SystemSetting is used when env is unset (localhost convenience).
 * Defaults apply when neither is set.
 */
export function resolveEffectiveOllamaConfig(
  settings: OllamaSettingsValues = {},
  env: NodeJS.ProcessEnv = process.env,
): EffectiveOllamaConfig {
  const envBase = (env.OLLAMA_BASE_URL ?? "").trim().replace(/\/$/, "");
  const envChat = (env.OLLAMA_CHAT_MODEL ?? "").trim();
  const envEmbed = (env.OLLAMA_EMBED_MODEL ?? "").trim();

  const settingsBase = asString(settings.baseUrl);
  const settingsChat = asString(settings.chatModel);
  const settingsEmbed = asString(settings.embedModel);

  const baseUrl: EffectiveOllamaField<string> = envBase
    ? { value: envBase, source: "env" }
    : settingsBase
      ? { value: settingsBase, source: "settings" }
      : { value: DEFAULT_OLLAMA_BASE_URL, source: "default" };

  const chatModel: EffectiveOllamaField<string> = envChat
    ? { value: envChat, source: "env" }
    : settingsChat
      ? { value: settingsChat, source: "settings" }
      : { value: DEFAULT_OLLAMA_CHAT_MODEL, source: "default" };

  const embedModel: EffectiveOllamaField<string> = envEmbed
    ? { value: envEmbed, source: "env" }
    : settingsEmbed
      ? { value: settingsEmbed, source: "settings" }
      : { value: DEFAULT_OLLAMA_EMBED_MODEL, source: "default" };

  return {
    baseUrl,
    chatModel,
    embedModel,
    apiKeyConfigured: Boolean((env.OLLAMA_API_KEY ?? "").trim()),
    resolutionRule: "env_wins",
  };
}

/** Flat config suitable for OllamaClient construction (never expose apiKey to client). */
export function toOllamaClientConfig(effective: EffectiveOllamaConfig, env: NodeJS.ProcessEnv = process.env) {
  return {
    baseUrl: effective.baseUrl.value,
    chatModel: effective.chatModel.value,
    embedModel: effective.embedModel.value,
    apiKey: (env.OLLAMA_API_KEY ?? "").trim() || undefined,
  };
}
