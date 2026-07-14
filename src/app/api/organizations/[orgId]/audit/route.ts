import type { AuditAction } from "@prisma/client";

import { listOrgHistoryFeed } from "@/features/history/lib/history-feed";
import { requireOrgRole } from "@/features/organizations/lib/authorization";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";

type RouteContext = { params: Promise<{ orgId: string }> };

const AUDIT_ACTIONS = new Set<string>([
  "CREATE",
  "UPDATE",
  "DELETE",
  "LOGIN",
  "LOGOUT",
  "UPLOAD",
  "PROCESS",
  "SEARCH",
  "CHAT",
  "REPORT",
  "AGENT_RUN",
  "CONSENSUS",
  "SIMULATION",
  "USER_DELETED",
  "USER_RECOVERED",
  "USER_PURGED",
  "ORG_DELETED",
  "ORG_RECOVERED",
  "ORG_PURGED",
  "SETTINGS_UPDATE",
  "MAINTENANCE",
]);

export async function GET(request: Request, context: RouteContext) {
  try {
    const { orgId } = await context.params;
    await requireOrgRole(orgId, "VIEWER");

    const url = new URL(request.url);
    const actionParam = url.searchParams.get("action") ?? undefined;
    const userId = url.searchParams.get("userId") ?? undefined;
    const entityId = url.searchParams.get("entityId") ?? undefined;
    const projectId = url.searchParams.get("projectId") ?? undefined;
    const fromParam = url.searchParams.get("from");
    const toParam = url.searchParams.get("to");
    const page = Number(url.searchParams.get("page") ?? "1");
    const pageSize = Number(url.searchParams.get("pageSize") ?? "25");

    if (actionParam && !AUDIT_ACTIONS.has(actionParam)) {
      return apiError("VALIDATION_ERROR", "Invalid audit action filter", 400);
    }

    const result = await listOrgHistoryFeed(orgId, {
      action: actionParam as AuditAction | undefined,
      userId,
      entityId,
      projectId,
      from: fromParam ? new Date(fromParam) : undefined,
      to: toParam ? new Date(toParam) : undefined,
      page: Number.isFinite(page) ? page : 1,
      pageSize: Number.isFinite(pageSize) ? pageSize : 25,
    });

    return apiSuccess({
      items: result.items.map((item) => ({
        id: item.id,
        action: item.action,
        entityType: item.entityType,
        entityId: item.entityId,
        metadata: item.metadata,
        ipAddress: item.ipAddress,
        createdAt: item.createdAt.toISOString(),
        source: item.source,
        sourceLabel: item.sourceLabel,
        user: item.user
          ? { id: item.user.id, name: item.user.name, email: item.user.email }
          : null,
      })),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
