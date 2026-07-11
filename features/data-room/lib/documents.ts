import { createHash, randomUUID } from "crypto";

import type { DocumentClassification, DocumentStatus, DocumentType, Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { buildDocumentStorageKey, getStorage } from "@/lib/storage";

import { validateUploadFile } from "./mime";
import { ensureFolderPath, getFolderById } from "./folders";
import { splitRelativeUploadPath } from "./paths";

export type DocumentErrorCode = "NOT_FOUND" | "VALIDATION_ERROR" | "CONFLICT";

export type DocumentServiceError = {
  error: DocumentErrorCode;
  message: string;
};

const documentInclude = {
  folder: {
    select: { id: true, name: true, path: true },
  },
} as const;

export type DocumentWithFolder = Prisma.DocumentGetPayload<{ include: typeof documentInclude }>;

export async function getDocumentById(documentId: string) {
  return prisma.document.findFirst({
    where: { id: documentId, deletedAt: null },
    include: documentInclude,
  });
}

export async function listDocuments(
  projectId: string,
  options: { folderId?: string | "root" | "all" } = {},
) {
  const where: Prisma.DocumentWhereInput = {
    projectId,
    deletedAt: null,
  };

  if (options.folderId === "root") {
    where.folderId = null;
  } else if (options.folderId && options.folderId !== "all") {
    where.folderId = options.folderId;
  }

  return prisma.document.findMany({
    where,
    include: documentInclude,
    orderBy: [{ name: "asc" }],
  });
}

export async function countProjectDocuments(projectId: string) {
  return prisma.document.count({
    where: { projectId, deletedAt: null },
  });
}

export async function countDocumentsByProjectIds(projectIds: string[]) {
  if (projectIds.length === 0) {
    return {} as Record<string, number>;
  }

  const grouped = await prisma.document.groupBy({
    by: ["projectId"],
    where: { projectId: { in: projectIds }, deletedAt: null },
    _count: { _all: true },
  });

  return Object.fromEntries(grouped.map((row) => [row.projectId, row._count._all]));
}

export async function getProjectDocumentStats(projectId: string) {
  const [total, pending, folders] = await Promise.all([
    prisma.document.count({ where: { projectId, deletedAt: null } }),
    prisma.document.count({ where: { projectId, deletedAt: null, status: "PENDING" } }),
    prisma.folder.count({ where: { projectId, deletedAt: null } }),
  ]);

  return { total, pending, folders };
}

export async function countDocumentsByFolderIds(projectId: string, folderIds: string[]) {
  if (folderIds.length === 0) {
    return {} as Record<string, number>;
  }

  const grouped = await prisma.document.groupBy({
    by: ["folderId"],
    where: {
      projectId,
      deletedAt: null,
      folderId: { in: folderIds },
    },
    _count: { _all: true },
  });

  return Object.fromEntries(
    grouped
      .filter((row) => row.folderId)
      .map((row) => [row.folderId as string, row._count._all]),
  );
}

export async function updateDocument(
  documentId: string,
  data: {
    name?: string;
    folderId?: string | null;
    classification?: DocumentClassification | null;
  },
): Promise<{ document: DocumentWithFolder } | DocumentServiceError> {
  const document = await getDocumentById(documentId);
  if (!document) {
    return { error: "NOT_FOUND", message: "Document not found" };
  }

  if (data.folderId) {
    const folder = await getFolderById(data.folderId);
    if (!folder || folder.projectId !== document.projectId) {
      return { error: "NOT_FOUND", message: "Folder not found" };
    }
  }

  if (data.name && data.name !== document.name) {
    const conflict = await prisma.document.findFirst({
      where: {
        projectId: document.projectId,
        folderId: data.folderId !== undefined ? data.folderId : document.folderId,
        name: data.name,
        deletedAt: null,
        NOT: { id: documentId },
      },
    });
    if (conflict) {
      return { error: "CONFLICT", message: "A document with this name already exists in the folder" };
    }
  }

  const updated = await prisma.document.update({
    where: { id: documentId },
    data: {
      ...(data.name !== undefined ? { name: data.name, originalName: data.name } : {}),
      ...(data.folderId !== undefined ? { folderId: data.folderId } : {}),
      ...(data.classification !== undefined ? { classification: data.classification } : {}),
    },
    include: documentInclude,
  });

  return { document: updated };
}

export async function bulkSoftDeleteDocuments(
  documentIds: string[],
): Promise<{ deleted: number } | DocumentServiceError> {
  if (documentIds.length === 0) {
    return { deleted: 0 };
  }

  const result = await prisma.document.updateMany({
    where: { id: { in: documentIds }, deletedAt: null },
    data: { deletedAt: new Date() },
  });

  return { deleted: result.count };
}

export async function bulkReprocessDocuments(
  documentIds: string[],
): Promise<{ updated: number } | DocumentServiceError> {
  if (documentIds.length === 0) {
    return { updated: 0 };
  }

  const result = await prisma.document.updateMany({
    where: { id: { in: documentIds }, deletedAt: null },
    data: {
      status: "PENDING",
      errorMessage: null,
      processedAt: null,
    },
  });

  return { updated: result.count };
}

export async function bulkUpdateDocumentTags(
  documentIds: string[],
  tags: string[],
): Promise<{ updated: number }> {
  if (documentIds.length === 0) {
    return { updated: 0 };
  }

  const result = await prisma.document.updateMany({
    where: { id: { in: documentIds }, deletedAt: null },
    data: { tags },
  });

  return { updated: result.count };
}

export async function getDocumentVersionRecord(documentId: string, version: number) {
  return prisma.documentVersion.findFirst({
    where: { documentId, version },
  });
}

function contentHash(buffer: Buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

export type UploadDocumentInput = {
  organizationId: string;
  projectId: string;
  uploadedById: string;
  fileName: string;
  mimeType?: string | null;
  buffer: Buffer;
  folderId?: string | null;
  /** Relative path from drag-drop folder upload, e.g. "Financials/Q1/report.pdf" */
  relativePath?: string | null;
  /** When set, create a new version of this document instead of a new document */
  replaceDocumentId?: string | null;
  tags?: string[];
};

export async function uploadDocument(
  input: UploadDocumentInput,
): Promise<{ document: DocumentWithFolder } | DocumentServiceError> {
  const validation = validateUploadFile({
    fileName: input.fileName,
    mimeType: input.mimeType,
    size: input.buffer.byteLength,
  });

  if (!validation.ok) {
    return { error: "VALIDATION_ERROR", message: validation.message };
  }

  let folderId = input.folderId ?? null;

  if (input.relativePath) {
    const { folders, fileName } = splitRelativeUploadPath(input.relativePath);
    if (folders.length > 0) {
      folderId = await ensureFolderPath(input.projectId, folders, folderId);
    }
    // Prefer the leaf file name from the relative path when present
    if (fileName) {
      input = { ...input, fileName };
    }
  }

  if (folderId) {
    const folder = await getFolderById(folderId);
    if (!folder || folder.projectId !== input.projectId) {
      return { error: "NOT_FOUND", message: "Folder not found" };
    }
  }

  const hash = contentHash(input.buffer);
  const displayName = input.fileName.trim() || "untitled";

  if (input.replaceDocumentId) {
    return createDocumentVersion({
      ...input,
      replaceDocumentId: input.replaceDocumentId,
      mimeType: validation.mimeType,
      type: validation.type,
      hash,
      displayName,
      folderId,
    });
  }

  // Same name in same folder → new version of existing document
  const existing = await prisma.document.findFirst({
    where: {
      projectId: input.projectId,
      folderId,
      name: displayName,
      deletedAt: null,
    },
  });

  if (existing) {
    return createDocumentVersion({
      ...input,
      replaceDocumentId: existing.id,
      mimeType: validation.mimeType,
      type: validation.type,
      hash,
      displayName,
      folderId,
    });
  }

  const documentId = randomUUID();
  const version = 1;
  const storageKey = buildDocumentStorageKey({
    organizationId: input.organizationId,
    projectId: input.projectId,
    documentId,
    version,
    fileName: displayName,
  });

  const storage = getStorage();
  await storage.putObject(storageKey, input.buffer, validation.mimeType);

  try {
    const document = await prisma.$transaction(async (tx) => {
      const created = await tx.document.create({
        data: {
          id: documentId,
          projectId: input.projectId,
          folderId,
          name: displayName,
          originalName: displayName,
          mimeType: validation.mimeType,
          type: validation.type,
          filePath: storageKey,
          fileSize: input.buffer.byteLength,
          status: "PENDING",
          version,
          contentHash: hash,
          tags: input.tags ?? [],
        },
        include: documentInclude,
      });

      await tx.documentVersion.create({
        data: {
          documentId: created.id,
          version,
          filePath: storageKey,
          fileSize: input.buffer.byteLength,
          uploadedById: input.uploadedById,
        },
      });

      return created;
    });

    return { document };
  } catch (error) {
    await storage.deleteObject(storageKey).catch(() => undefined);
    throw error;
  }
}

async function createDocumentVersion(params: {
  organizationId: string;
  projectId: string;
  uploadedById: string;
  replaceDocumentId: string;
  mimeType: string;
  type: DocumentType;
  hash: string;
  displayName: string;
  buffer: Buffer;
  folderId: string | null;
  tags?: string[];
}): Promise<{ document: DocumentWithFolder } | DocumentServiceError> {
  const existing = await getDocumentById(params.replaceDocumentId);
  if (!existing || existing.projectId !== params.projectId) {
    return { error: "NOT_FOUND", message: "Document not found" };
  }

  const nextVersion = existing.version + 1;
  const storageKey = buildDocumentStorageKey({
    organizationId: params.organizationId,
    projectId: params.projectId,
    documentId: existing.id,
    version: nextVersion,
    fileName: params.displayName,
  });

  const storage = getStorage();
  await storage.putObject(storageKey, params.buffer, params.mimeType);

  try {
    const document = await prisma.$transaction(async (tx) => {
      const updated = await tx.document.update({
        where: { id: existing.id },
        data: {
          name: params.displayName,
          originalName: params.displayName,
          mimeType: params.mimeType,
          type: params.type,
          filePath: storageKey,
          fileSize: params.buffer.byteLength,
          status: "PENDING" satisfies DocumentStatus,
          version: nextVersion,
          contentHash: params.hash,
          folderId: params.folderId ?? existing.folderId,
          tags: params.tags ?? existing.tags,
          errorMessage: null,
          processedAt: null,
        },
        include: documentInclude,
      });

      await tx.documentVersion.create({
        data: {
          documentId: existing.id,
          version: nextVersion,
          filePath: storageKey,
          fileSize: params.buffer.byteLength,
          uploadedById: params.uploadedById,
        },
      });

      return updated;
    });

    return { document };
  } catch (error) {
    await storage.deleteObject(storageKey).catch(() => undefined);
    throw error;
  }
}

export async function softDeleteDocument(
  documentId: string,
): Promise<{ deleted: true } | DocumentServiceError> {
  const document = await getDocumentById(documentId);
  if (!document) {
    return { error: "NOT_FOUND", message: "Document not found" };
  }

  await prisma.document.update({
    where: { id: documentId },
    data: { deletedAt: new Date() },
  });

  return { deleted: true };
}

export async function getDeletedDocumentById(documentId: string) {
  return prisma.document.findFirst({
    where: { id: documentId, deletedAt: { not: null } },
    include: documentInclude,
  });
}

export async function listDeletedDocuments(projectId: string) {
  return prisma.document.findMany({
    where: { projectId, deletedAt: { not: null } },
    include: documentInclude,
    orderBy: { deletedAt: "desc" },
  });
}

export async function restoreDocument(
  documentId: string,
): Promise<{ document: DocumentWithFolder } | DocumentServiceError> {
  const document = await getDeletedDocumentById(documentId);
  if (!document) {
    return { error: "NOT_FOUND", message: "Deleted document not found" };
  }

  let folderId = document.folderId;
  if (folderId) {
    const folder = await getFolderById(folderId);
    if (!folder) {
      folderId = null;
    }
  }

  const conflict = await prisma.document.findFirst({
    where: {
      projectId: document.projectId,
      folderId,
      name: document.name,
      deletedAt: null,
      id: { not: documentId },
    },
  });

  if (conflict) {
    return {
      error: "CONFLICT",
      message: "A document with this name already exists in the target folder",
    };
  }

  const updated = await prisma.document.update({
    where: { id: documentId },
    data: { deletedAt: null, folderId },
    include: documentInclude,
  });

  return { document: updated };
}

export async function permanentlyDeleteDocument(
  documentId: string,
): Promise<{ deleted: true } | DocumentServiceError> {
  const document = await getDeletedDocumentById(documentId);
  if (!document) {
    return { error: "NOT_FOUND", message: "Deleted document not found" };
  }

  const versions = await listDocumentVersions(documentId);
  const storage = getStorage();
  const paths = new Set<string>([document.filePath, ...versions.map((v) => v.filePath)]);

  await prisma.document.delete({ where: { id: documentId } });

  for (const filePath of paths) {
    await storage.deleteObject(filePath).catch(() => undefined);
  }

  return { deleted: true };
}

export async function bulkRestoreDocuments(
  documentIds: string[],
): Promise<{ restored: number } | DocumentServiceError> {
  let restored = 0;
  for (const documentId of documentIds) {
    const result = await restoreDocument(documentId);
    if ("document" in result) {
      restored++;
    }
  }
  return { restored };
}

export async function bulkPermanentlyDeleteDocuments(
  documentIds: string[],
): Promise<{ deleted: number } | DocumentServiceError> {
  let deleted = 0;
  for (const documentId of documentIds) {
    const result = await permanentlyDeleteDocument(documentId);
    if ("deleted" in result && result.deleted) {
      deleted++;
    }
  }
  return { deleted };
}

export async function getDocumentProcessingSummary(projectId: string) {
  const [pending, processing, ready, failed, recent] = await Promise.all([
    prisma.document.count({ where: { projectId, deletedAt: null, status: "PENDING" } }),
    prisma.document.count({ where: { projectId, deletedAt: null, status: "PROCESSING" } }),
    prisma.document.count({ where: { projectId, deletedAt: null, status: "READY" } }),
    prisma.document.count({ where: { projectId, deletedAt: null, status: "FAILED" } }),
    prisma.document.findMany({
      where: {
        projectId,
        deletedAt: null,
        status: { in: ["PENDING", "PROCESSING", "FAILED"] },
      },
      select: { id: true, name: true, status: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 20,
    }),
  ]);

  return {
    pending,
    processing,
    ready,
    failed,
    total: pending + processing + ready + failed,
    active: pending + processing,
    items: recent,
  };
}

export async function updateDocumentTags(
  documentId: string,
  tags: string[],
): Promise<{ document: DocumentWithFolder } | DocumentServiceError> {
  const document = await getDocumentById(documentId);
  if (!document) {
    return { error: "NOT_FOUND", message: "Document not found" };
  }

  const updated = await prisma.document.update({
    where: { id: documentId },
    data: { tags },
    include: documentInclude,
  });

  return { document: updated };
}

export async function listDocumentVersions(documentId: string) {
  return prisma.documentVersion.findMany({
    where: { documentId },
    include: {
      uploadedBy: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { version: "desc" },
  });
}

export async function reprocessDocument(
  documentId: string,
): Promise<{ document: DocumentWithFolder } | DocumentServiceError> {
  const document = await getDocumentById(documentId);
  if (!document) {
    return { error: "NOT_FOUND", message: "Document not found" };
  }

  const updated = await prisma.document.update({
    where: { id: documentId },
    data: {
      status: "PENDING",
      errorMessage: null,
      processedAt: null,
    },
    include: documentInclude,
  });

  return { document: updated };
}
