import { requireOrgRole } from "@/features/organizations/lib/authorization";
import {
  getFolderById,
  softDeleteFolder,
  updateFolder,
} from "@/features/data-room/lib/folders";
import {
  DATA_ROOM_DELETE_MIN_ROLE,
  DATA_ROOM_UPLOAD_MIN_ROLE,
} from "@/features/data-room/lib/roles";
import { updateFolderSchema } from "@/features/data-room/schemas";
import { getProjectById } from "@/features/projects/lib/projects";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";

interface RouteContext {
  params: Promise<{ folderId: string }>;
}

async function resolveFolderProject(folderId: string) {
  const folder = await getFolderById(folderId);
  if (!folder) {
    return null;
  }
  const project = await getProjectById(folder.projectId);
  if (!project) {
    return null;
  }
  return { folder, project };
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { folderId } = await context.params;
    const resolved = await resolveFolderProject(folderId);

    if (!resolved) {
      return apiError("NOT_FOUND", "Folder not found", 404);
    }

    await requireOrgRole(
      resolved.project.workspace.organizationId,
      DATA_ROOM_UPLOAD_MIN_ROLE,
    );

    const body = await request.json();
    const parsed = updateFolderSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Invalid folder data",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }

    const result = await updateFolder(folderId, parsed.data);
    if ("error" in result) {
      const status =
        result.error === "CONFLICT" ? 409 : result.error === "NOT_FOUND" ? 404 : 400;
      return apiError(result.error, result.message, status);
    }

    return apiSuccess(result.folder);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { folderId } = await context.params;
    const resolved = await resolveFolderProject(folderId);

    if (!resolved) {
      return apiError("NOT_FOUND", "Folder not found", 404);
    }

    await requireOrgRole(
      resolved.project.workspace.organizationId,
      DATA_ROOM_DELETE_MIN_ROLE,
    );

    const result = await softDeleteFolder(folderId);
    if ("error" in result) {
      return apiError(result.error, result.message, 404);
    }

    return apiSuccess({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
