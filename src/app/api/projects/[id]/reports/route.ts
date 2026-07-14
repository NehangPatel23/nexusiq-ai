export const dynamic = "force-dynamic";
export const maxDuration = 120;

import { requireProjectReportsAccess } from "@/features/reports/lib/authorization";
import { generateReport } from "@/features/reports/lib/generate-report";
import { listProjectReports } from "@/features/reports/lib/reports";
import { generateReportBodySchema } from "@/features/reports/schemas";
import { OllamaUnavailableError } from "@/lib/ai/agents/run-agent";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    await requireProjectReportsAccess(id);
    const reports = await listProjectReports(id);
    return apiSuccess({ reports });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { project, session } = await requireProjectReportsAccess(id);
    const parsed = generateReportBodySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Invalid request body",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }

    const result = await generateReport({
      projectId: project.id,
      projectName: project.name,
      organizationId: project.workspace.organizationId,
      userId: session.userId,
      reportType: parsed.data.reportType,
      title: parsed.data.title,
      forceRegenerate: parsed.data.forceRegenerate,
      formats: parsed.data.formats,
    });

    const { logReportGenerated } = await import("@/features/reports/lib/report-audit");
    void logReportGenerated({
      projectId: project.id,
      actorId: session.userId,
      reportId: result.reportId,
      title: result.title,
      reportType: result.reportType,
    }).catch(() => undefined);

    return apiSuccess(result, 201);
  } catch (error) {
    if (error instanceof OllamaUnavailableError) {
      return apiError(error.code, error.message, 503);
    }
    return handleApiError(error);
  }
}
