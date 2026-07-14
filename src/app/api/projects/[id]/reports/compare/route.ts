export const dynamic = "force-dynamic";

import { compareProjectReports } from "@/features/reports/lib/compare-reports";
import { requireProjectReportsAccess } from "@/features/reports/lib/authorization";
import { compareReportsBodySchema } from "@/features/reports/schemas";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id: projectId } = await context.params;
    await requireProjectReportsAccess(projectId);
    const parsed = compareReportsBodySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Invalid request body",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }

    const result = await compareProjectReports({
      projectId,
      leftReportId: parsed.data.leftReportId,
      rightReportId: parsed.data.rightReportId,
    });

    return apiSuccess({ compare: result });
  } catch (error) {
    return handleApiError(error);
  }
}
