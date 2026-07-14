import type {
  ContradictionFactType,
  ContradictionStatus,
  FindingSeverity,
  Prisma,
} from "@prisma/client";

import { excerptAroundValue } from "@/features/contradictions/lib/excerpt-match";
import { prisma } from "@/lib/db";

export type ContradictionView = {
  id: string;
  projectId: string;
  subject: string;
  factType: ContradictionFactType;
  valueA: string;
  valueB: string;
  documentAId: string;
  documentAName: string;
  chunkAId: string;
  chunkAExcerpt: string | null;
  valueAMatched: boolean;
  valueAMatchedText: string | null;
  documentBId: string;
  documentBName: string;
  chunkBId: string;
  chunkBExcerpt: string | null;
  valueBMatched: boolean;
  valueBMatchedText: string | null;
  explanation: string;
  severity: FindingSeverity;
  status: ContradictionStatus;
  resolutionNote: string | null;
  statusChangedById: string | null;
  statusChangedAt: string | null;
  promotedFindingId: string | null;
  createdAt: string;
  updatedAt: string;
};

const include = {
  documentA: { select: { id: true, name: true } },
  documentB: { select: { id: true, name: true } },
} satisfies Prisma.ContradictionInclude;

async function resolveEvidenceExcerpt(params: {
  content: string | null | undefined;
  value: string;
  factType: ContradictionFactType;
  documentId: string;
  preferredChunkId: string;
}): Promise<{
  excerpt: string | null;
  matched: boolean;
  matchedText: string | null;
  evidenceChunkId: string;
}> {
  const primary = excerptAroundValue(params.content, params.value, {
    factType: params.factType,
  });
  if (primary.match) {
    return {
      excerpt: primary.excerpt,
      matched: true,
      matchedText: primary.match.matchedText,
      evidenceChunkId: params.preferredChunkId,
    };
  }

  // Linked chunk may be wrong (seed / LLM drift) — search sibling chunks on the same document.
  const siblings = await prisma.documentChunk.findMany({
    where: {
      documentId: params.documentId,
      id: { not: params.preferredChunkId },
    },
    select: { id: true, content: true },
    take: 40,
  });

  for (const sibling of siblings) {
    const hit = excerptAroundValue(sibling.content, params.value, {
      factType: params.factType,
    });
    if (hit.match) {
      return {
        excerpt: hit.excerpt,
        matched: true,
        matchedText: hit.match.matchedText,
        evidenceChunkId: sibling.id,
      };
    }
  }

  return {
    excerpt: primary.excerpt,
    matched: false,
    matchedText: null,
    evidenceChunkId: params.preferredChunkId,
  };
}

async function attachExcerpts(
  rows: Array<
    Prisma.ContradictionGetPayload<{ include: typeof include }> & {
      chunkAId: string;
      chunkBId: string;
    }
  >,
): Promise<ContradictionView[]> {
  const chunkIds = [...new Set(rows.flatMap((r) => [r.chunkAId, r.chunkBId]))];
  const chunks =
    chunkIds.length === 0
      ? []
      : await prisma.documentChunk.findMany({
          where: { id: { in: chunkIds } },
          select: { id: true, content: true },
        });
  const byId = new Map(chunks.map((c) => [c.id, c.content]));

  const views: ContradictionView[] = [];
  for (const row of rows) {
    const evidenceA = await resolveEvidenceExcerpt({
      content: byId.get(row.chunkAId),
      value: row.valueA,
      factType: row.factType,
      documentId: row.documentAId,
      preferredChunkId: row.chunkAId,
    });
    const evidenceB = await resolveEvidenceExcerpt({
      content: byId.get(row.chunkBId),
      value: row.valueB,
      factType: row.factType,
      documentId: row.documentBId,
      preferredChunkId: row.chunkBId,
    });

    views.push({
      id: row.id,
      projectId: row.projectId,
      subject: row.subject,
      factType: row.factType,
      valueA: row.valueA,
      valueB: row.valueB,
      documentAId: row.documentAId,
      documentAName: row.documentA.name,
      chunkAId: evidenceA.evidenceChunkId,
      chunkAExcerpt: evidenceA.excerpt,
      valueAMatched: evidenceA.matched,
      valueAMatchedText: evidenceA.matchedText,
      documentBId: row.documentBId,
      documentBName: row.documentB.name,
      chunkBId: evidenceB.evidenceChunkId,
      chunkBExcerpt: evidenceB.excerpt,
      valueBMatched: evidenceB.matched,
      valueBMatchedText: evidenceB.matchedText,
      explanation: row.explanation,
      severity: row.severity,
      status: row.status,
      resolutionNote: row.resolutionNote,
      statusChangedById: row.statusChangedById,
      statusChangedAt: row.statusChangedAt?.toISOString() ?? null,
      promotedFindingId: row.promotedFindingId,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    });
  }

  return views;
}

export async function listContradictions(params: {
  projectId: string;
  status?: ContradictionStatus;
  severity?: FindingSeverity;
}): Promise<ContradictionView[]> {
  const rows = await prisma.contradiction.findMany({
    where: {
      projectId: params.projectId,
      ...(params.status ? { status: params.status } : {}),
      ...(params.severity ? { severity: params.severity } : {}),
    },
    include,
    orderBy: [{ severity: "asc" }, { createdAt: "desc" }],
  });
  // FindingSeverity enum order in Postgres is declaration order (CRITICAL first) —
  // but Prisma orders lexicographically for enums unless we sort in JS.
  const views = await attachExcerpts(rows);
  const rank: Record<FindingSeverity, number> = {
    CRITICAL: 0,
    HIGH: 1,
    MEDIUM: 2,
    LOW: 3,
  };
  return views.sort(
    (a, b) => rank[a.severity] - rank[b.severity] || b.createdAt.localeCompare(a.createdAt),
  );
}

export async function createContradiction(params: {
  projectId: string;
  subject: string;
  factType: ContradictionFactType;
  valueA: string;
  valueB: string;
  documentAId: string;
  chunkAId: string;
  documentBId: string;
  chunkBId: string;
  explanation: string;
  severity: FindingSeverity;
}) {
  return prisma.contradiction.create({
    data: {
      projectId: params.projectId,
      subject: params.subject,
      factType: params.factType,
      valueA: params.valueA,
      valueB: params.valueB,
      documentAId: params.documentAId,
      chunkAId: params.chunkAId,
      documentBId: params.documentBId,
      chunkBId: params.chunkBId,
      explanation: params.explanation,
      severity: params.severity,
      status: "OPEN",
    },
    include,
  });
}

export async function updateContradictionStatus(params: {
  id: string;
  status?: ContradictionStatus;
  severity?: FindingSeverity;
  resolutionNote?: string | null;
  statusChangedById?: string | null;
}) {
  if (
    params.status === undefined &&
    params.severity === undefined &&
    params.resolutionNote === undefined
  ) {
    throw new Error("Provide status, severity, and/or resolutionNote");
  }
  const now = new Date();
  return prisma.contradiction.update({
    where: { id: params.id },
    data: {
      ...(params.status !== undefined ? { status: params.status } : {}),
      ...(params.severity !== undefined ? { severity: params.severity } : {}),
      ...(params.resolutionNote !== undefined
        ? { resolutionNote: params.resolutionNote }
        : {}),
      ...(params.status !== undefined || params.resolutionNote !== undefined
        ? {
            statusChangedAt: now,
            statusChangedById: params.statusChangedById ?? null,
          }
        : {}),
    },
    select: {
      id: true,
      status: true,
      severity: true,
      subject: true,
      projectId: true,
      resolutionNote: true,
      statusChangedById: true,
      statusChangedAt: true,
      promotedFindingId: true,
      updatedAt: true,
    },
  });
}

export async function promoteContradictionToFinding(params: {
  contradictionId: string;
  userId?: string | null;
}) {
  const row = await prisma.contradiction.findUnique({
    where: { id: params.contradictionId },
  });
  if (!row) throw new Error("Contradiction not found");
  if (row.promotedFindingId) {
    const existing = await prisma.finding.findUnique({
      where: { id: row.promotedFindingId },
    });
    if (existing) return { finding: existing, contradiction: row, created: false };
  }

  const finding = await prisma.finding.create({
    data: {
      projectId: row.projectId,
      agentType: "RISK",
      category: "Contradiction",
      title: row.subject,
      description: `${row.explanation}\n\nConflict: ${row.valueA} vs ${row.valueB}`,
      severity: row.severity,
      status: "OPEN",
      documentId: row.documentAId,
      sourceChunkId: row.chunkAId,
      metadata: {
        source: "contradiction",
        contradictionId: row.id,
        documentBId: row.documentBId,
        chunkBId: row.chunkBId,
        factType: row.factType,
        promotedById: params.userId ?? null,
      },
    },
  });

  const contradiction = await prisma.contradiction.update({
    where: { id: row.id },
    data: {
      promotedFindingId: finding.id,
      statusChangedAt: new Date(),
      statusChangedById: params.userId ?? null,
    },
  });

  return { finding, contradiction, created: true };
}

export async function countOpenContradictions(projectId: string): Promise<number> {
  return prisma.contradiction.count({
    where: { projectId, status: "OPEN" },
  });
}
