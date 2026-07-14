export const dynamic = "force-dynamic";

import { requireReportAccess } from "@/features/reports/lib/authorization";
import { revokeReportShare } from "@/features/reports/lib/report-shares";
import { apiSuccess, handleApiError } from "@/lib/api";

interface RouteContext {
  params: Promise<{ id: string; shareId: string }>;
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id, shareId } = await context.params;
    const { session } = await requireReportAccess(id);
    await revokeReportShare(shareId, session.userId);
    return apiSuccess({ revoked: true });
  } catch (error) {
    return handleApiError(error);
  }
}
