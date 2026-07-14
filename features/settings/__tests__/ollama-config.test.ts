import { describe, expect, it } from "vitest";

import { resolveEffectiveOllamaConfig } from "@/features/settings/lib/ollama-config";

describe("resolveEffectiveOllamaConfig", () => {
  it("prefers non-empty env over settings and defaults", () => {
    const effective = resolveEffectiveOllamaConfig(
      {
        baseUrl: "http://settings.local:11434",
        chatModel: "settings-chat",
        embedModel: "settings-embed",
      },
      {
        OLLAMA_BASE_URL: "https://ollama.example.com",
        OLLAMA_CHAT_MODEL: "env-chat",
        OLLAMA_EMBED_MODEL: "env-embed",
        OLLAMA_API_KEY: "secret",
      } as NodeJS.ProcessEnv,
    );

    expect(effective.baseUrl).toEqual({ value: "https://ollama.example.com", source: "env" });
    expect(effective.chatModel).toEqual({ value: "env-chat", source: "env" });
    expect(effective.embedModel).toEqual({ value: "env-embed", source: "env" });
    expect(effective.apiKeyConfigured).toBe(true);
    expect(effective.resolutionRule).toBe("env_wins");
  });

  it("falls back to SystemSetting when env is unset", () => {
    const effective = resolveEffectiveOllamaConfig(
      {
        baseUrl: "http://localhost:21434",
        chatModel: "custom-llama",
        embedModel: "custom-embed",
      },
      {} as NodeJS.ProcessEnv,
    );

    expect(effective.baseUrl).toEqual({ value: "http://localhost:21434", source: "settings" });
    expect(effective.chatModel).toEqual({ value: "custom-llama", source: "settings" });
    expect(effective.embedModel).toEqual({ value: "custom-embed", source: "settings" });
    expect(effective.apiKeyConfigured).toBe(false);
  });

  it("uses defaults when neither env nor settings provide values", () => {
    const effective = resolveEffectiveOllamaConfig({}, {} as NodeJS.ProcessEnv);
    expect(effective.baseUrl.source).toBe("default");
    expect(effective.chatModel.value).toBe("llama3");
    expect(effective.embedModel.value).toBe("nomic-embed-text");
  });
});
