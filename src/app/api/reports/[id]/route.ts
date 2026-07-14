export const dynamic = "force-dynamic";

import {
  deleteReport,
  duplicateReport,
  getReportDetail,
  renameReport,
  requireReportAccess,
} from "@/features/reports/lib/reports";
import { duplicateReportBodySchema, renameReportBodySchema } from "@/features/reports/schemas";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    await requireReportAccess(id);
    const report = await getReportDetail(id);
    if (!report) {
      return apiError("NOT_FOUND", "Report not found", 404);
    }
    return apiSuccess({ report });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { session } = await requireReportAccess(id);
    const parsed = renameReportBodySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Invalid request body",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }
    const report = await renameReport(id, session.userId, parsed.data.title);
    return apiSuccess({ report });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { session } = await requireReportAccess(id);
    const url = new URL(request.url);
    const action = url.searchParams.get("action");
    if (action !== "duplicate") {
      return apiError("VALIDATION_ERROR", "Unsupported action. Use ?action=duplicate", 400);
    }
    const parsed = duplicateReportBodySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Invalid request body",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }
    const report = await duplicateReport(id, session.userId, parsed.data.title);
    return apiSuccess({ report }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { session } = await requireReportAccess(id);
    const result = await deleteReport(id, session.userId);
    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
