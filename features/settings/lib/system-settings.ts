import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";

import {
  AI_SETTING_KEYS,
  resolveEffectiveOllamaConfig,
  type EffectiveOllamaConfig,
  type OllamaSettingsValues,
} from "./ollama-config";

function jsonStringValue(raw: Prisma.JsonValue | null | undefined): string | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "string") return raw;
  if (typeof raw === "object" && raw !== null && "value" in raw) {
    const v = (raw as { value: unknown }).value;
    return typeof v === "string" ? v : null;
  }
  return null;
}

export async function getAiSystemSettings(): Promise<OllamaSettingsValues> {
  const rows = await prisma.systemSetting.findMany({
    where: { key: { in: Object.values(AI_SETTING_KEYS) } },
  });
  const map = new Map(rows.map((row) => [row.key, row.value]));

  return {
    baseUrl: jsonStringValue(map.get(AI_SETTING_KEYS.baseUrl) ?? null),
    chatModel: jsonStringValue(map.get(AI_SETTING_KEYS.chatModel) ?? null),
    embedModel: jsonStringValue(map.get(AI_SETTING_KEYS.embedModel) ?? null),
  };
}

export async function getEffectiveOllamaConfig(): Promise<EffectiveOllamaConfig> {
  const settings = await getAiSystemSettings();
  const { setOllamaSettingsOverlay } = await import("./ollama-runtime");
  setOllamaSettingsOverlay(settings);
  return resolveEffectiveOllamaConfig(settings);
}

export async function upsertAiSystemSettings(input: {
  baseUrl?: string;
  chatModel?: string;
  embedModel?: string;
}): Promise<OllamaSettingsValues> {
  const ops: Array<Promise<unknown>> = [];

  if (input.baseUrl !== undefined) {
    ops.push(
      prisma.systemSetting.upsert({
        where: { key: AI_SETTING_KEYS.baseUrl },
        create: { key: AI_SETTING_KEYS.baseUrl, value: input.baseUrl },
        update: { value: input.baseUrl },
      }),
    );
  }
  if (input.chatModel !== undefined) {
    ops.push(
      prisma.systemSetting.upsert({
        where: { key: AI_SETTING_KEYS.chatModel },
        create: { key: AI_SETTING_KEYS.chatModel, value: input.chatModel },
        update: { value: input.chatModel },
      }),
    );
  }
  if (input.embedModel !== undefined) {
    ops.push(
      prisma.systemSetting.upsert({
        where: { key: AI_SETTING_KEYS.embedModel },
        create: { key: AI_SETTING_KEYS.embedModel, value: input.embedModel },
        update: { value: input.embedModel },
      }),
    );
  }

  await Promise.all(ops);
  const settings = await getAiSystemSettings();
  const { setOllamaSettingsOverlay } = await import("./ollama-runtime");
  setOllamaSettingsOverlay(settings);
  return settings;
}

/** Hydrate the in-memory overlay from DB (call on cold start paths). */
export async function hydrateOllamaSettingsOverlay(): Promise<void> {
  const settings = await getAiSystemSettings();
  const { setOllamaSettingsOverlay } = await import("./ollama-runtime");
  setOllamaSettingsOverlay(settings);
}
