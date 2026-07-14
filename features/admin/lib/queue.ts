import type { DocumentStatus } from "@prisma/client";

import { prisma } from "@/lib/db";

import { documentsInOrgWhere } from "./org-scope";

export type QueueSummary = {
  pending: number;
  processing: number;
  failed: number;
  ready: number;
};

export type FailedDocumentRow = {
  id: string;
  name: string;
  projectId: string;
  projectName: string;
  errorMessage: string | null;
  updatedAt: Date;
};

export async function getQueueSummary(organizationId: string): Promise<QueueSummary> {
  const where = documentsInOrgWhere(organizationId);
  const groups = await prisma.document.groupBy({
    by: ["status"],
    where,
    _count: { _all: true },
  });

  const counts: Record<DocumentStatus, number> = {
    PENDING: 0,
    PROCESSING: 0,
    READY: 0,
    FAILED: 0,
  };
  for (const row of groups) {
    counts[row.status] = row._count._all;
  }

  return {
    pending: counts.PENDING,
    processing: counts.PROCESSING,
    failed: counts.FAILED,
    ready: counts.READY,
  };
}

export async function listRecentFailedDocuments(
  organizationId: string,
  limit = 25,
): Promise<FailedDocumentRow[]> {
  const docs = await prisma.document.findMany({
    where: {
      ...documentsInOrgWhere(organizationId),
      status: "FAILED",
    },
    select: {
      id: true,
      name: true,
      projectId: true,
      errorMessage: true,
      updatedAt: true,
      project: { select: { name: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });

  return docs.map((d) => ({
    id: d.id,
    name: d.name,
    projectId: d.projectId,
    projectName: d.project.name,
    errorMessage: d.errorMessage,
    updatedAt: d.updatedAt,
  }));
}

/**
 * Reset FAILED docs to PENDING for worker reprocess.
 * Does not run inline processing on Vercel (ENABLE_INLINE_PROCESSING should be false).
 */
export async function retryFailedDocumentsInOrg(options: {
  organizationId: string;
  documentIds?: string[];
}): Promise<{ updated: number }> {
  const { resetDocumentForReprocess } = await import("@/lib/ai/processing/reprocess");
  const { scheduleDocumentProcessing } = await import("@/lib/ai/processing/inline");

  const where = {
    ...documentsInOrgWhere(options.organizationId),
    status: "FAILED" as const,
    ...(options.documentIds?.length ? { id: { in: options.documentIds } } : {}),
  };

  const failed = await prisma.document.findMany({
    where,
    select: { id: true },
  });

  for (const doc of failed) {
    await resetDocumentForReprocess(doc.id);
    scheduleDocumentProcessing(doc.id);
  }

  return { updated: failed.length };
}
