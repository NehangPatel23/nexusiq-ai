import { prisma } from "@/lib/db";
import { entityMergeKey, normalizeEntityName, normalizeEntityType } from "./normalize";

export type GraphNode = {
  id: string;
  name: string;
  type: string;
  documentIds: string[];
  metadata: unknown;
};

export type GraphEdge = {
  id: string;
  source: string;
  target: string;
  relationType: string;
  confidence: number;
  sourceChunkId: string | null;
};

export type GraphData = {
  nodes: GraphNode[];
  edges: GraphEdge[];
};

export async function getProjectGraph(projectId: string): Promise<GraphData> {
  const [entities, relations] = await Promise.all([
    prisma.entity.findMany({
      where: { projectId },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    }),
    prisma.entityRelation.findMany({
      where: { projectId },
      include: {
        sourceChunk: {
          select: { documentId: true },
        },
      },
    }),
  ]);

  const documentIdsByEntity = new Map<string, Set<string>>();

  for (const relation of relations) {
    const documentId = relation.sourceChunk?.documentId;
    if (!documentId) continue;
    for (const entityId of [relation.sourceEntityId, relation.targetEntityId]) {
      const set = documentIdsByEntity.get(entityId) ?? new Set<string>();
      set.add(documentId);
      documentIdsByEntity.set(entityId, set);
    }
  }

  return {
    nodes: entities.map((entity) => ({
      id: entity.id,
      name: entity.name,
      type: normalizeEntityType(entity.type),
      documentIds: [...(documentIdsByEntity.get(entity.id) ?? [])],
      metadata: entity.metadata,
    })),
    edges: relations.map((relation) => ({
      id: relation.id,
      source: relation.sourceEntityId,
      target: relation.targetEntityId,
      relationType: relation.relationType,
      confidence: relation.confidence,
      sourceChunkId: relation.sourceChunkId,
    })),
  };
}

export type EntityDetail = {
  id: string;
  name: string;
  type: string;
  metadata: unknown;
  relations: Array<{
    id: string;
    relationType: string;
    confidence: number;
    direction: "outgoing" | "incoming";
    other: { id: string; name: string; type: string };
    sourceChunkId: string | null;
    documentId: string | null;
    documentName: string | null;
    excerpt: string | null;
  }>;
  documents: Array<{ id: string; name: string }>;
  findings: Array<{
    id: string;
    title: string;
    severity: string | null;
    status: string;
    agentType: string;
  }>;
  timelineEvents: Array<{
    id: string;
    title: string;
    eventDate: string;
    category: string;
  }>;
};

export async function getEntityDetail(params: {
  projectId: string;
  entityId: string;
}): Promise<EntityDetail | null> {
  const entity = await prisma.entity.findFirst({
    where: { id: params.entityId, projectId: params.projectId },
  });
  if (!entity) return null;

  const relations = await prisma.entityRelation.findMany({
    where: {
      projectId: params.projectId,
      OR: [{ sourceEntityId: entity.id }, { targetEntityId: entity.id }],
    },
    include: {
      sourceEntity: { select: { id: true, name: true, type: true } },
      targetEntity: { select: { id: true, name: true, type: true } },
      sourceChunk: {
        select: {
          id: true,
          content: true,
          document: { select: { id: true, name: true } },
        },
      },
    },
  });

  const documentsMap = new Map<string, string>();
  const mappedRelations = relations.map((relation) => {
    const outgoing = relation.sourceEntityId === entity.id;
    const other = outgoing ? relation.targetEntity : relation.sourceEntity;
    const document = relation.sourceChunk?.document;
    if (document) documentsMap.set(document.id, document.name);
    return {
      id: relation.id,
      relationType: relation.relationType,
      confidence: relation.confidence,
      direction: (outgoing ? "outgoing" : "incoming") as "outgoing" | "incoming",
      other: {
        id: other.id,
        name: other.name,
        type: normalizeEntityType(other.type),
      },
      sourceChunkId: relation.sourceChunkId,
      documentId: document?.id ?? null,
      documentName: document?.name ?? null,
      excerpt: relation.sourceChunk?.content?.slice(0, 280) ?? null,
    };
  });

  const [findings, timelineEvents] = await Promise.all([
    prisma.finding.findMany({
      where: {
        projectId: params.projectId,
        OR: [
          { title: { contains: entity.name, mode: "insensitive" } },
          { description: { contains: entity.name, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        title: true,
        severity: true,
        status: true,
        agentType: true,
      },
      take: 12,
      orderBy: { createdAt: "desc" },
    }),
    prisma.timelineEvent.findMany({
      where: {
        projectId: params.projectId,
        deletedAt: null,
        OR: [
          { title: { contains: entity.name, mode: "insensitive" } },
          { description: { contains: entity.name, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        title: true,
        eventDate: true,
        category: true,
      },
      take: 8,
      orderBy: { eventDate: "desc" },
    }),
  ]);

  return {
    id: entity.id,
    name: entity.name,
    type: normalizeEntityType(entity.type),
    metadata: entity.metadata,
    relations: mappedRelations,
    documents: [...documentsMap.entries()].map(([id, name]) => ({ id, name })),
    findings,
    timelineEvents: timelineEvents.map((event) => ({
      id: event.id,
      title: event.title,
      eventDate: event.eventDate.toISOString(),
      category: event.category,
    })),
  };
}

export async function createGraphNode(params: {
  projectId: string;
  name: string;
  type: string;
}): Promise<GraphNode> {
  const name = normalizeEntityName(params.name);
  const type = normalizeEntityType(params.type);
  if (!name) {
    throw new Error("Entity name is required");
  }

  const existing = await prisma.entity.findFirst({
    where: {
      projectId: params.projectId,
      type,
      name: { equals: name, mode: "insensitive" },
    },
  });
  if (existing) {
    return {
      id: existing.id,
      name: existing.name,
      type: normalizeEntityType(existing.type),
      documentIds: [],
      metadata: existing.metadata,
    };
  }

  const created = await prisma.entity.create({
    data: {
      projectId: params.projectId,
      name,
      type,
      metadata: { source: "manual" },
    },
  });

  return {
    id: created.id,
    name: created.name,
    type: normalizeEntityType(created.type),
    documentIds: [],
    metadata: created.metadata,
  };
}

export async function updateGraphNode(params: {
  projectId: string;
  entityId: string;
  name?: string;
  type?: string;
}): Promise<GraphNode | null> {
  const existing = await prisma.entity.findFirst({
    where: { id: params.entityId, projectId: params.projectId },
  });
  if (!existing) return null;

  const name =
    params.name !== undefined ? normalizeEntityName(params.name) : existing.name;
  const type =
    params.type !== undefined ? normalizeEntityType(params.type) : normalizeEntityType(existing.type);
  if (!name) {
    throw new Error("Entity name is required");
  }

  if (name !== existing.name || type !== normalizeEntityType(existing.type)) {
    const clash = await prisma.entity.findFirst({
      where: {
        projectId: params.projectId,
        type,
        name: { equals: name, mode: "insensitive" },
        NOT: { id: params.entityId },
      },
      select: { id: true },
    });
    if (clash) {
      throw new Error("Another node already uses this name and type");
    }
  }

  const updated = await prisma.entity.update({
    where: { id: params.entityId },
    data: { name, type },
  });

  return {
    id: updated.id,
    name: updated.name,
    type: normalizeEntityType(updated.type),
    documentIds: [],
    metadata: updated.metadata,
  };
}

export async function deleteGraphNode(params: {
  projectId: string;
  entityId: string;
}): Promise<boolean> {
  const existing = await prisma.entity.findFirst({
    where: { id: params.entityId, projectId: params.projectId },
    select: { id: true },
  });
  if (!existing) return false;

  // Relations cascade via Prisma onDelete, but delete explicitly for clarity.
  await prisma.entityRelation.deleteMany({
    where: {
      projectId: params.projectId,
      OR: [{ sourceEntityId: params.entityId }, { targetEntityId: params.entityId }],
    },
  });
  await prisma.entity.delete({ where: { id: params.entityId } });
  return true;
}

export type GraphRelationView = {
  id: string;
  sourceEntityId: string;
  targetEntityId: string;
  relationType: string;
  confidence: number;
  sourceChunkId: string | null;
};

export async function createGraphRelation(params: {
  projectId: string;
  sourceEntityId: string;
  targetEntityId: string;
  relationType: string;
  confidence?: number;
}): Promise<GraphRelationView> {
  if (params.sourceEntityId === params.targetEntityId) {
    throw new Error("Source and target must be different nodes");
  }

  const [source, target] = await Promise.all([
    prisma.entity.findFirst({
      where: { id: params.sourceEntityId, projectId: params.projectId },
      select: { id: true },
    }),
    prisma.entity.findFirst({
      where: { id: params.targetEntityId, projectId: params.projectId },
      select: { id: true },
    }),
  ]);
  if (!source || !target) {
    throw new Error("Both entities must belong to this project");
  }

  const relationType = params.relationType.trim() || "related_to";
  const confidence = Math.min(1, Math.max(0, params.confidence ?? 0.8));

  const existing = await prisma.entityRelation.findFirst({
    where: {
      projectId: params.projectId,
      sourceEntityId: params.sourceEntityId,
      targetEntityId: params.targetEntityId,
      relationType,
    },
  });
  if (existing) {
    return {
      id: existing.id,
      sourceEntityId: existing.sourceEntityId,
      targetEntityId: existing.targetEntityId,
      relationType: existing.relationType,
      confidence: existing.confidence,
      sourceChunkId: existing.sourceChunkId,
    };
  }

  const created = await prisma.entityRelation.create({
    data: {
      projectId: params.projectId,
      sourceEntityId: params.sourceEntityId,
      targetEntityId: params.targetEntityId,
      relationType,
      confidence,
      sourceChunkId: null,
    },
  });

  return {
    id: created.id,
    sourceEntityId: created.sourceEntityId,
    targetEntityId: created.targetEntityId,
    relationType: created.relationType,
    confidence: created.confidence,
    sourceChunkId: created.sourceChunkId,
  };
}

export async function updateGraphRelation(params: {
  projectId: string;
  relationId: string;
  relationType?: string;
  confidence?: number;
  reverse?: boolean;
}): Promise<GraphRelationView | null> {
  const existing = await prisma.entityRelation.findFirst({
    where: { id: params.relationId, projectId: params.projectId },
  });
  if (!existing) return null;

  const sourceEntityId = params.reverse ? existing.targetEntityId : existing.sourceEntityId;
  const targetEntityId = params.reverse ? existing.sourceEntityId : existing.targetEntityId;
  const relationType =
    params.relationType !== undefined
      ? params.relationType.trim() || "related_to"
      : existing.relationType;
  const confidence =
    params.confidence !== undefined
      ? Math.min(1, Math.max(0, params.confidence))
      : existing.confidence;

  const clash = await prisma.entityRelation.findFirst({
    where: {
      projectId: params.projectId,
      sourceEntityId,
      targetEntityId,
      relationType,
      NOT: { id: params.relationId },
    },
    select: { id: true },
  });
  if (clash) {
    throw new Error("An identical relation already exists");
  }

  const updated = await prisma.entityRelation.update({
    where: { id: params.relationId },
    data: {
      sourceEntityId,
      targetEntityId,
      relationType,
      confidence,
    },
  });

  return {
    id: updated.id,
    sourceEntityId: updated.sourceEntityId,
    targetEntityId: updated.targetEntityId,
    relationType: updated.relationType,
    confidence: updated.confidence,
    sourceChunkId: updated.sourceChunkId,
  };
}

export async function deleteGraphRelation(params: {
  projectId: string;
  relationId: string;
}): Promise<boolean> {
  const existing = await prisma.entityRelation.findFirst({
    where: { id: params.relationId, projectId: params.projectId },
    select: { id: true },
  });
  if (!existing) return false;
  await prisma.entityRelation.delete({ where: { id: params.relationId } });
  return true;
}

export async function upsertEntityByKey(params: {
  projectId: string;
  name: string;
  type: string;
  cache: Map<string, string>;
}): Promise<string> {
  const name = normalizeEntityName(params.name);
  const type = normalizeEntityType(params.type);
  const key = entityMergeKey(name, type);
  const cached = params.cache.get(key);
  if (cached) return cached;

  const existing = await prisma.entity.findFirst({
    where: {
      projectId: params.projectId,
      type,
      name: { equals: name, mode: "insensitive" },
    },
    select: { id: true, name: true },
  });

  if (existing) {
    params.cache.set(key, existing.id);
    return existing.id;
  }

  // Fall back: match prior NER rows that used uppercase types.
  const legacy = await prisma.entity.findFirst({
    where: {
      projectId: params.projectId,
      name: { equals: name, mode: "insensitive" },
    },
    select: { id: true, type: true },
  });
  if (legacy && normalizeEntityType(legacy.type) === type) {
    params.cache.set(key, legacy.id);
    return legacy.id;
  }

  const created = await prisma.entity.create({
    data: {
      projectId: params.projectId,
      name,
      type,
    },
    select: { id: true },
  });
  params.cache.set(key, created.id);
  return created.id;
}
