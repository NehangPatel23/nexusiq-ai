import { randomUUID } from "crypto";

import { prisma } from "@/lib/db";
import { getOllamaClient, type OllamaClient } from "../ollama-client";

export type ExtractedEntity = {
  name: string;
  type: string;
};

export type ExtractedRelation = {
  source: string;
  target: string;
  relationType: string;
  confidence: number;
};

export type NerResult = {
  entities: ExtractedEntity[];
  relations: ExtractedRelation[];
};

const ENTITY_REGEX =
  /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})\s+(Inc\.|LLC|Ltd\.|Corp\.|Corporation|Company)\b/g;

export function extractEntitiesRegex(text: string): ExtractedEntity[] {
  const entities: ExtractedEntity[] = [];
  const seen = new Set<string>();

  for (const match of text.matchAll(ENTITY_REGEX)) {
    const name = `${match[1]} ${match[2]}`.trim();
    const key = name.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      entities.push({ name, type: "ORGANIZATION" });
    }
  }

  const moneyMatches = text.match(/\$[\d,]+(?:\.\d{2})?/g) ?? [];
  for (const amount of moneyMatches.slice(0, 5)) {
    const key = amount.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      entities.push({ name: amount, type: "MONEY" });
    }
  }

  return entities;
}

export async function extractEntitiesAndRelations(
  text: string,
  client?: OllamaClient,
): Promise<NerResult> {
  const sample = text.slice(0, 8000).trim();
  if (!sample) {
    return { entities: [], relations: [] };
  }

  const ollama = client ?? getOllamaClient();

  try {
    const raw = await ollama.chat(
      [
        {
          role: "system",
          content:
            'Extract named entities and relationships from the text. Respond with JSON only: {"entities":[{"name":"...","type":"PERSON|ORGANIZATION|DATE|MONEY|LOCATION|OTHER"}],"relations":[{"source":"...","target":"...","relationType":"...","confidence":0.0-1.0}]}',
        },
        { role: "user", content: sample },
      ],
      { format: "json" },
    );

    const parsed = JSON.parse(raw) as {
      entities?: ExtractedEntity[];
      relations?: ExtractedRelation[];
    };

    return {
      entities: (parsed.entities ?? []).filter((e) => e.name && e.type),
      relations: (parsed.relations ?? []).filter(
        (r) => r.source && r.target && r.relationType,
      ),
    };
  } catch {
    return { entities: extractEntitiesRegex(sample), relations: [] };
  }
}

export async function persistEntitiesAndRelations(params: {
  projectId: string;
  sourceChunkId?: string;
  ner: NerResult;
}): Promise<void> {
  const entityIdByKey = new Map<string, string>();

  for (const entity of params.ner.entities) {
    const key = `${entity.type}::${entity.name.toLowerCase()}`;
    if (entityIdByKey.has(key)) continue;

    const existing = await prisma.entity.findFirst({
      where: {
        projectId: params.projectId,
        name: entity.name,
        type: entity.type,
      },
      select: { id: true },
    });

    if (existing) {
      entityIdByKey.set(key, existing.id);
      continue;
    }

    const id = randomUUID();
    await prisma.entity.create({
      data: {
        id,
        projectId: params.projectId,
        name: entity.name,
        type: entity.type,
      },
    });
    entityIdByKey.set(key, id);
  }

  for (const relation of params.ner.relations) {
    const sourceKey = [...entityIdByKey.keys()].find((k) =>
      k.endsWith(`::${relation.source.toLowerCase()}`),
    );
    const targetKey = [...entityIdByKey.keys()].find((k) =>
      k.endsWith(`::${relation.target.toLowerCase()}`),
    );

    let sourceId = sourceKey ? entityIdByKey.get(sourceKey) : undefined;
    let targetId = targetKey ? entityIdByKey.get(targetKey) : undefined;

    if (!sourceId) {
      const row = await prisma.entity.findFirst({
        where: { projectId: params.projectId, name: relation.source },
        select: { id: true },
      });
      sourceId = row?.id;
    }
    if (!targetId) {
      const row = await prisma.entity.findFirst({
        where: { projectId: params.projectId, name: relation.target },
        select: { id: true },
      });
      targetId = row?.id;
    }

    if (!sourceId || !targetId || sourceId === targetId) continue;

    await prisma.entityRelation.create({
      data: {
        projectId: params.projectId,
        sourceEntityId: sourceId,
        targetEntityId: targetId,
        relationType: relation.relationType,
        confidence: Math.min(1, Math.max(0, relation.confidence ?? 0.5)),
        sourceChunkId: params.sourceChunkId,
      },
    });
  }
}
