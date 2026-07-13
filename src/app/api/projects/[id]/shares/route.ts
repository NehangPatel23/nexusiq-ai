import { requireOrgRole } from "@/features/organizations/lib/authorization";
import { createDataRoomShare, listDataRoomShares } from "@/features/data-room/lib/shares";
import { DATA_ROOM_ADMIN_MIN_ROLE } from "@/features/data-room/lib/roles";
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

    await requireOrgRole(project.workspace.organizationId, DATA_ROOM_ADMIN_MIN_ROLE);

    const shares = await listDataRoomShares(projectId);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    return apiSuccess({
      items: shares.map((share) => ({
        ...share,
        url: `${baseUrl}/share/data-room/${share.token}`,
      })),
      total: shares.length,
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

    const session = await requireOrgRole(
      project.workspace.organizationId,
      DATA_ROOM_ADMIN_MIN_ROLE,
    );

    const body = (await request.json()) as {
      label?: string;
      expiresInDays?: number;
    };

    const share = await createDataRoomShare({
      projectId,
      createdById: session.userId,
      label: body.label,
      expiresInDays: body.expiresInDays,
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const url = `${baseUrl}/share/data-room/${share.token}`;

    return apiSuccess({ ...share, url }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
