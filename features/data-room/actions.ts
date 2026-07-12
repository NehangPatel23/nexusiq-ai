"use server";

import type { OrgRole } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { AuthError, requireOrgRole } from "@/features/organizations/lib/authorization";
import { getProjectById } from "@/features/projects/lib/projects";

import { logDataRoomAudit } from "./lib/audit";
import {
  bulkPermanentlyDeleteDocuments,
  bulkRestoreDocuments,
  bulkSoftDeleteDocuments,
  bulkReprocessDocuments,
  bulkUpdateDocumentClassification,
  bulkUpdateDocumentTags,
  dismissDuplicateFlag,
  getDeletedDocumentById,
  getDocumentById,
  markIntentionalDuplicate,
  permanentlyDeleteDocument,
  reprocessDocument,
  restoreDocument,
  retryFailedDocuments,
  softDeleteDocument,
  updateDocument,
  updateDocumentTags,
} from "./lib/documents";
import {
  createFolder,
  getDeletedFolderById,
  getFolderById,
  permanentlyDeleteFolder,
  restoreFolder,
  softDeleteFolder,
  updateFolder,
} from "./lib/folders";
import { purgeExpiredDeletedItems, type PurgeResult } from "./lib/retention";
import {
  createDataRoomShare,
  revokeDataRoomShare,
} from "./lib/shares";
import {
  DATA_ROOM_DELETE_MIN_ROLE,
  DATA_ROOM_UPLOAD_MIN_ROLE,
} from "./lib/roles";
import {
  bulkDocumentIdsSchema,
  bulkDocumentClassificationSchema,
  bulkDocumentTagsSchema,
  createFolderSchema,
  updateDocumentSchema,
  updateDocumentTagsSchema,
  updateFolderSchema,
} from "./schemas";

export type ActionResult<T = void> =
  | { success: true; data?: T }
  | {
      success: false;
      error: { code: string; message: string; fieldErrors?: Record<string, string[]> };
    };

function validationError(fieldErrors: Record<string, string[]>) {
  return {
    success: false as const,
    error: {
      code: "VALIDATION_ERROR",
      message: "Please fix the errors below",
      fieldErrors,
    },
  };
}

function actionError(code: string, message: string) {
  return { success: false as const, error: { code, message } };
}

async function requireProjectAccess(projectId: string, minRole: OrgRole) {
  const project = await getProjectById(projectId);
  if (!project) {
    throw new AuthError("NOT_FOUND", "Project not found");
  }
  const session = await requireOrgRole(project.workspace.organizationId, minRole);
  return { project, session };
}

export async function createFolderAction(
  projectId: string,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireProjectAccess(projectId, DATA_ROOM_UPLOAD_MIN_ROLE);
    const parsed = createFolderSchema.safeParse(input);
    if (!parsed.success) {
      return validationError(parsed.error.flatten().fieldErrors);
    }

    const result = await createFolder(projectId, parsed.data);
    if ("error" in result) {
      return actionError(result.error, result.message);
    }

    revalidatePath(`/dashboard/projects/${projectId}/data-room`);
    return { success: true, data: { id: result.folder!.id } };
  } catch (error) {
    if (error instanceof AuthError) {
      return actionError(error.code, error.message);
    }
    throw error;
  }
}

export async function updateFolderAction(
  projectId: string,
  folderId: string,
  input: unknown,
): Promise<ActionResult> {
  try {
    await requireProjectAccess(projectId, DATA_ROOM_UPLOAD_MIN_ROLE);
    const parsed = updateFolderSchema.safeParse(input);
    if (!parsed.success) {
      return validationError(parsed.error.flatten().fieldErrors);
    }

    const result = await updateFolder(folderId, parsed.data);
    if ("error" in result) {
      return actionError(result.error, result.message);
    }

    revalidatePath(`/dashboard/projects/${projectId}/data-room`);
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return actionError(error.code, error.message);
    }
    throw error;
  }
}

export async function deleteFolderAction(
  projectId: string,
  folderId: string,
): Promise<ActionResult> {
  try {
    const { session } = await requireProjectAccess(projectId, DATA_ROOM_DELETE_MIN_ROLE);
    const folder = await getFolderById(folderId);
    if (!folder) {
      return actionError("NOT_FOUND", "Folder not found");
    }
    const result = await softDeleteFolder(folderId);
    if ("error" in result) {
      return actionError(result.error, result.message);
    }

    await logDataRoomAudit({
      projectId,
      actorId: session.userId,
      action: "SOFT_DELETED",
      resourceType: "FOLDER",
      resourceId: folderId,
      resourceName: folder.name,
    });

    revalidatePath(`/dashboard/projects/${projectId}/data-room`);
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return actionError(error.code, error.message);
    }
    throw error;
  }
}

export async function deleteDocumentAction(
  projectId: string,
  documentId: string,
): Promise<ActionResult> {
  try {
    const { session } = await requireProjectAccess(projectId, DATA_ROOM_DELETE_MIN_ROLE);
    const doc = await getDocumentById(documentId);
    if (!doc) {
      return actionError("NOT_FOUND", "Document not found");
    }
    const result = await softDeleteDocument(documentId);
    if ("error" in result) {
      return actionError(result.error, result.message);
    }

    await logDataRoomAudit({
      projectId,
      actorId: session.userId,
      action: "SOFT_DELETED",
      resourceType: "DOCUMENT",
      resourceId: documentId,
      resourceName: doc.name,
    });

    revalidatePath(`/dashboard/projects/${projectId}/data-room`);
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return actionError(error.code, error.message);
    }
    throw error;
  }
}

export async function updateDocumentTagsAction(
  projectId: string,
  documentId: string,
  input: unknown,
): Promise<ActionResult> {
  try {
    await requireProjectAccess(projectId, DATA_ROOM_UPLOAD_MIN_ROLE);
    const parsed = updateDocumentTagsSchema.safeParse(input);
    if (!parsed.success) {
      return validationError(parsed.error.flatten().fieldErrors);
    }

    const result = await updateDocumentTags(documentId, parsed.data.tags);
    if ("error" in result) {
      return actionError(result.error, result.message);
    }

    revalidatePath(`/dashboard/projects/${projectId}/data-room`);
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return actionError(error.code, error.message);
    }
    throw error;
  }
}

export async function reprocessDocumentAction(
  projectId: string,
  documentId: string,
): Promise<ActionResult> {
  try {
    await requireProjectAccess(projectId, DATA_ROOM_UPLOAD_MIN_ROLE);
    const result = await reprocessDocument(documentId);
    if ("error" in result) {
      return actionError(result.error, result.message);
    }

    revalidatePath(`/dashboard/projects/${projectId}/data-room`);
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return actionError(error.code, error.message);
    }
    throw error;
  }
}

export async function updateDocumentAction(
  projectId: string,
  documentId: string,
  input: unknown,
): Promise<ActionResult> {
  try {
    await requireProjectAccess(projectId, DATA_ROOM_UPLOAD_MIN_ROLE);
    const parsed = updateDocumentSchema.safeParse(input);
    if (!parsed.success) {
      return validationError(parsed.error.flatten().fieldErrors);
    }

    const result = await updateDocument(documentId, parsed.data);
    if ("error" in result) {
      const code = result.error;
      return actionError(code, result.message);
    }

    revalidatePath(`/dashboard/projects/${projectId}/data-room`);
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return actionError(error.code, error.message);
    }
    throw error;
  }
}

export async function bulkDeleteDocumentsAction(
  projectId: string,
  input: unknown,
): Promise<ActionResult<{ deleted: number }>> {
  try {
    await requireProjectAccess(projectId, DATA_ROOM_DELETE_MIN_ROLE);
    const parsed = bulkDocumentIdsSchema.safeParse(input);
    if (!parsed.success) {
      return validationError(parsed.error.flatten().fieldErrors);
    }

    const result = await bulkSoftDeleteDocuments(parsed.data.documentIds);
    if ("error" in result) {
      return actionError(result.error, result.message);
    }

    revalidatePath(`/dashboard/projects/${projectId}/data-room`);
    return { success: true, data: { deleted: result.deleted } };
  } catch (error) {
    if (error instanceof AuthError) {
      return actionError(error.code, error.message);
    }
    throw error;
  }
}

export async function bulkReprocessDocumentsAction(
  projectId: string,
  input: unknown,
): Promise<ActionResult<{ updated: number }>> {
  try {
    await requireProjectAccess(projectId, DATA_ROOM_UPLOAD_MIN_ROLE);
    const parsed = bulkDocumentIdsSchema.safeParse(input);
    if (!parsed.success) {
      return validationError(parsed.error.flatten().fieldErrors);
    }

    const result = await bulkReprocessDocuments(parsed.data.documentIds);
    if ("error" in result) {
      return actionError(result.error, result.message);
    }

    revalidatePath(`/dashboard/projects/${projectId}/data-room`);
    return { success: true, data: { updated: result.updated } };
  } catch (error) {
    if (error instanceof AuthError) {
      return actionError(error.code, error.message);
    }
    throw error;
  }
}

export async function bulkUpdateDocumentTagsAction(
  projectId: string,
  input: unknown,
): Promise<ActionResult<{ updated: number }>> {
  try {
    await requireProjectAccess(projectId, DATA_ROOM_UPLOAD_MIN_ROLE);
    const parsed = bulkDocumentTagsSchema.safeParse(input);
    if (!parsed.success) {
      return validationError(parsed.error.flatten().fieldErrors);
    }

    const result = await bulkUpdateDocumentTags(
      parsed.data.documentIds,
      parsed.data.tags,
    );

    revalidatePath(`/dashboard/projects/${projectId}/data-room`);
    return { success: true, data: { updated: result.updated } };
  } catch (error) {
    if (error instanceof AuthError) {
      return actionError(error.code, error.message);
    }
    throw error;
  }
}

export async function bulkUpdateDocumentClassificationAction(
  projectId: string,
  input: unknown,
): Promise<ActionResult<{ updated: number }>> {
  try {
    await requireProjectAccess(projectId, DATA_ROOM_UPLOAD_MIN_ROLE);
    const parsed = bulkDocumentClassificationSchema.safeParse(input);
    if (!parsed.success) {
      return validationError(parsed.error.flatten().fieldErrors);
    }

    const result = await bulkUpdateDocumentClassification(
      parsed.data.documentIds,
      parsed.data.classification,
    );

    revalidatePath(`/dashboard/projects/${projectId}/data-room`);
    return { success: true, data: { updated: result.updated } };
  } catch (error) {
    if (error instanceof AuthError) {
      return actionError(error.code, error.message);
    }
    throw error;
  }
}

export async function retryFailedDocumentsAction(
  projectId: string,
): Promise<ActionResult<{ updated: number }>> {
  try {
    await requireProjectAccess(projectId, DATA_ROOM_UPLOAD_MIN_ROLE);
    const result = await retryFailedDocuments(projectId);
    revalidatePath(`/dashboard/projects/${projectId}/data-room`);
    return { success: true, data: { updated: result.updated } };
  } catch (error) {
    if (error instanceof AuthError) {
      return actionError(error.code, error.message);
    }
    throw error;
  }
}

export async function dismissDuplicateAction(
  projectId: string,
  documentId: string,
): Promise<ActionResult> {
  try {
    await requireProjectAccess(projectId, DATA_ROOM_UPLOAD_MIN_ROLE);
    const result = await dismissDuplicateFlag(documentId);
    if ("error" in result) {
      return actionError(result.error, result.message);
    }
    revalidatePath(`/dashboard/projects/${projectId}/data-room`);
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return actionError(error.code, error.message);
    }
    throw error;
  }
}

export async function markIntentionalDuplicateAction(
  projectId: string,
  documentId: string,
): Promise<ActionResult> {
  try {
    await requireProjectAccess(projectId, DATA_ROOM_UPLOAD_MIN_ROLE);
    const result = await markIntentionalDuplicate(documentId);
    if ("error" in result) {
      return actionError(result.error, result.message);
    }
    revalidatePath(`/dashboard/projects/${projectId}/data-room`);
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return actionError(error.code, error.message);
    }
    throw error;
  }
}

export async function restoreDocumentAction(
  projectId: string,
  documentId: string,
): Promise<ActionResult> {
  try {
    const { session } = await requireProjectAccess(projectId, DATA_ROOM_DELETE_MIN_ROLE);
    const deleted = await getDeletedDocumentById(documentId);
    const result = await restoreDocument(documentId);
    if ("error" in result) {
      const status = result.error === "CONFLICT" ? "CONFLICT" : result.error;
      return actionError(status, result.message);
    }

    await logDataRoomAudit({
      projectId,
      actorId: session.userId,
      action: "RESTORED",
      resourceType: "DOCUMENT",
      resourceId: documentId,
      resourceName: deleted?.name ?? result.document.name,
    });

    revalidatePath(`/dashboard/projects/${projectId}/data-room`);
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return actionError(error.code, error.message);
    }
    throw error;
  }
}

export async function permanentlyDeleteDocumentAction(
  projectId: string,
  documentId: string,
): Promise<ActionResult> {
  try {
    const { session } = await requireProjectAccess(projectId, DATA_ROOM_DELETE_MIN_ROLE);
    const deleted = await getDeletedDocumentById(documentId);
    const result = await permanentlyDeleteDocument(documentId);
    if ("error" in result) {
      return actionError(result.error, result.message);
    }

    if (deleted) {
      await logDataRoomAudit({
        projectId,
        actorId: session.userId,
        action: "PERMANENTLY_DELETED",
        resourceType: "DOCUMENT",
        resourceId: documentId,
        resourceName: deleted.name,
      });
    }

    revalidatePath(`/dashboard/projects/${projectId}/data-room`);
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return actionError(error.code, error.message);
    }
    throw error;
  }
}

export async function bulkRestoreDocumentsAction(
  projectId: string,
  input: unknown,
): Promise<ActionResult<{ restored: number }>> {
  try {
    await requireProjectAccess(projectId, DATA_ROOM_DELETE_MIN_ROLE);
    const parsed = bulkDocumentIdsSchema.safeParse(input);
    if (!parsed.success) {
      return validationError(parsed.error.flatten().fieldErrors);
    }

    const result = await bulkRestoreDocuments(parsed.data.documentIds);
    if ("error" in result) {
      return actionError(result.error, result.message);
    }

    revalidatePath(`/dashboard/projects/${projectId}/data-room`);
    return { success: true, data: { restored: result.restored } };
  } catch (error) {
    if (error instanceof AuthError) {
      return actionError(error.code, error.message);
    }
    throw error;
  }
}

export async function bulkPermanentlyDeleteDocumentsAction(
  projectId: string,
  input: unknown,
): Promise<ActionResult<{ deleted: number }>> {
  try {
    await requireProjectAccess(projectId, DATA_ROOM_DELETE_MIN_ROLE);
    const parsed = bulkDocumentIdsSchema.safeParse(input);
    if (!parsed.success) {
      return validationError(parsed.error.flatten().fieldErrors);
    }

    const result = await bulkPermanentlyDeleteDocuments(parsed.data.documentIds);
    if ("error" in result) {
      return actionError(result.error, result.message);
    }

    revalidatePath(`/dashboard/projects/${projectId}/data-room`);
    return { success: true, data: { deleted: result.deleted } };
  } catch (error) {
    if (error instanceof AuthError) {
      return actionError(error.code, error.message);
    }
    throw error;
  }
}

export async function restoreFolderAction(
  projectId: string,
  folderId: string,
): Promise<ActionResult> {
  try {
    const { session } = await requireProjectAccess(projectId, DATA_ROOM_DELETE_MIN_ROLE);
    const deleted = await getDeletedFolderById(folderId);
    const result = await restoreFolder(folderId);
    if ("error" in result) {
      return actionError(result.error, result.message);
    }

    await logDataRoomAudit({
      projectId,
      actorId: session.userId,
      action: "RESTORED",
      resourceType: "FOLDER",
      resourceId: folderId,
      resourceName: deleted?.name ?? result.folder.name,
    });

    revalidatePath(`/dashboard/projects/${projectId}/data-room`);
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return actionError(error.code, error.message);
    }
    throw error;
  }
}

export async function permanentlyDeleteFolderAction(
  projectId: string,
  folderId: string,
): Promise<ActionResult> {
  try {
    const { session } = await requireProjectAccess(projectId, DATA_ROOM_DELETE_MIN_ROLE);
    const deleted = await getDeletedFolderById(folderId);
    const result = await permanentlyDeleteFolder(folderId);
    if ("error" in result) {
      return actionError(result.error, result.message);
    }

    if (deleted) {
      await logDataRoomAudit({
        projectId,
        actorId: session.userId,
        action: "PERMANENTLY_DELETED",
        resourceType: "FOLDER",
        resourceId: folderId,
        resourceName: deleted.name,
      });
    }

    revalidatePath(`/dashboard/projects/${projectId}/data-room`);
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return actionError(error.code, error.message);
    }
    throw error;
  }
}

export async function purgeExpiredDeletedAction(
  projectId: string,
): Promise<ActionResult<PurgeResult>> {
  try {
    await requireProjectAccess(projectId, DATA_ROOM_DELETE_MIN_ROLE);
    const result = await purgeExpiredDeletedItems(projectId);
    revalidatePath(`/dashboard/projects/${projectId}/data-room`);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof AuthError) {
      return actionError(error.code, error.message);
    }
    throw error;
  }
}

export async function createShareLinkAction(
  projectId: string,
  input: { label?: string; expiresInDays?: number },
): Promise<ActionResult<{ token: string; url: string }>> {
  try {
    const { session } = await requireProjectAccess(projectId, DATA_ROOM_DELETE_MIN_ROLE);
    const share = await createDataRoomShare({
      projectId,
      createdById: session.userId,
      label: input.label,
      expiresInDays: input.expiresInDays,
    });

    await logDataRoomAudit({
      projectId,
      actorId: session.userId,
      action: "SHARE_CREATED",
      resourceType: "DOCUMENT",
      resourceId: share.id,
      resourceName: share.label ?? "Share link",
      metadata: { expiresAt: share.expiresAt?.toISOString() ?? null },
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    return {
      success: true,
      data: { token: share.token, url: `${baseUrl}/share/data-room/${share.token}` },
    };
  } catch (error) {
    if (error instanceof AuthError) {
      return actionError(error.code, error.message);
    }
    throw error;
  }
}

export async function revokeShareLinkAction(
  projectId: string,
  shareId: string,
): Promise<ActionResult> {
  try {
    const { session } = await requireProjectAccess(projectId, DATA_ROOM_DELETE_MIN_ROLE);
    await revokeDataRoomShare(shareId);

    await logDataRoomAudit({
      projectId,
      actorId: session.userId,
      action: "SHARE_REVOKED",
      resourceType: "DOCUMENT",
      resourceId: shareId,
      resourceName: "Share link",
    });

    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return actionError(error.code, error.message);
    }
    throw error;
  }
}
