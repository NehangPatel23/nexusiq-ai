import { requireOrgRole } from "@/features/organizations/lib/authorization";
import {
  buildFolderTree,
  createFolder,
  listFolders,
} from "@/features/data-room/lib/folders";
import {
  DATA_ROOM_UPLOAD_MIN_ROLE,
  DATA_ROOM_VIEW_MIN_ROLE,
} from "@/features/data-room/lib/roles";
import { createFolderSchema } from "@/features/data-room/schemas";
import { getProjectById } from "@/features/projects/lib/projects";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id: projectId } = await context.params;
    const project = await getProjectById(projectId);

    if (!project) {
      return apiError("NOT_FOUND", "Project not found", 404);
    }

    await requireOrgRole(project.workspace.organizationId, DATA_ROOM_VIEW_MIN_ROLE);

    const folders = await listFolders(projectId);
    return apiSuccess({
      items: folders,
      tree: buildFolderTree(folders),
      total: folders.length,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id: projectId } = await context.params;
    const project = await getProjectById(projectId);

    if (!project) {
      return apiError("NOT_FOUND", "Project not found", 404);
    }

    await requireOrgRole(project.workspace.organizationId, DATA_ROOM_UPLOAD_MIN_ROLE);

    const body = await request.json();
    const parsed = createFolderSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Invalid folder data",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }

    const result = await createFolder(projectId, parsed.data);
    if ("error" in result) {
      const status =
        result.error === "CONFLICT" ? 409 : result.error === "NOT_FOUND" ? 404 : 400;
      return apiError(result.error, result.message, status);
    }

    return apiSuccess(result.folder, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
