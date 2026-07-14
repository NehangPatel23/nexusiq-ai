import type { OllamaSettingsValues } from "./ollama-config";
import { resolveEffectiveOllamaConfig, toOllamaClientConfig } from "./ollama-config";

let settingsOverlay: OllamaSettingsValues | null = null;

/** Apply SystemSetting values used when env vars are unset. */
export function setOllamaSettingsOverlay(settings: OllamaSettingsValues | null) {
  settingsOverlay = settings;
}

export function getOllamaSettingsOverlay(): OllamaSettingsValues | null {
  return settingsOverlay;
}

/** Build Ollama client config with env-wins resolution over the in-memory settings overlay. */
export function resolveOllamaRuntimeConfig(env: NodeJS.ProcessEnv = process.env) {
  const effective = resolveEffectiveOllamaConfig(settingsOverlay ?? {}, env);
  return toOllamaClientConfig(effective, env);
}
