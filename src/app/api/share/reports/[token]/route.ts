export const dynamic = "force-dynamic";

import { getActiveReportShareByToken, reportSharePublicUrl } from "@/features/reports/lib/report-shares";
import { apiError, apiSuccess } from "@/lib/api";

interface RouteContext {
  params: Promise<{ token: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { token } = await context.params;
  if (!token) {
    return apiError("NOT_FOUND", "Share link not found", 404);
  }
  const result = await getActiveReportShareByToken(token);
  if (!result.ok) {
    const status = result.error === "EXPIRED" ? 410 : 404;
    return apiError(result.error, result.message, status);
  }

  const { share } = result;
  return apiSuccess({
    share: {
      label: share.label,
      format: share.format,
      expiresAt: share.expiresAt?.toISOString() ?? null,
      createdBy: share.createdBy.name ?? share.createdBy.email,
      url: reportSharePublicUrl(share.token),
    },
    report: {
      title: share.report.title,
      reportType: share.report.reportType,
      content: share.report.content,
      createdAt: share.report.createdAt.toISOString(),
      projectName: share.project.name,
    },
  });
}
