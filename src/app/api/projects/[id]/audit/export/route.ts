import { requireOrgRole } from "@/features/organizations/lib/authorization";
import {
  exportAuditEventsCsv,
  listDataRoomAuditEvents,
} from "@/features/data-room/lib/audit";
import { DATA_ROOM_DELETE_MIN_ROLE } from "@/features/data-room/lib/roles";
import { getProjectById } from "@/features/projects/lib/projects";
import { apiError, handleApiError } from "@/lib/api";

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

    await requireOrgRole(project.workspace.organizationId, DATA_ROOM_DELETE_MIN_ROLE);

    const events = await listDataRoomAuditEvents(projectId);
    const csv = exportAuditEventsCsv(events);

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="data-room-audit-${projectId.slice(0, 8)}.csv"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
