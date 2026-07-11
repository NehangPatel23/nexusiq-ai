import { listDocuments } from "@/features/data-room/lib/documents";
import { buildFolderTree, listFolders } from "@/features/data-room/lib/folders";
import { getActiveShareByToken } from "@/features/data-room/lib/shares";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";

interface RouteContext {
  params: Promise<{ token: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { token } = await context.params;
    const result = await getActiveShareByToken(token);

    if ("error" in result) {
      const code = result.error;
      const status = code === "NOT_FOUND" ? 404 : 410;
      return apiError(code, result.message, status);
    }

    const { share } = result;
    const projectId = share.projectId;

    const [folders, documents] = await Promise.all([
      listFolders(projectId),
      listDocuments(projectId, { folderId: "all" }),
    ]);

    return apiSuccess({
      project: {
        id: share.project.id,
        name: share.project.name,
        workspaceName: share.project.workspace.name,
      },
      share: {
        label: share.label,
        expiresAt: share.expiresAt,
        createdAt: share.createdAt,
      },
      folders: buildFolderTree(folders),
      documents,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
