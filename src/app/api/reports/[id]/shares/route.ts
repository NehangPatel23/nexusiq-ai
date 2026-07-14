export const dynamic = "force-dynamic";

import { createReportShare, listReportShares, reportSharePublicUrl } from "@/features/reports/lib/report-shares";
import { requireReportAccess } from "@/features/reports/lib/authorization";
import { createReportShareBodySchema } from "@/features/reports/schemas";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { session } = await requireReportAccess(id);
    const shares = await listReportShares(id, session.userId);
    return apiSuccess({
      items: shares.map((share) => ({
        id: share.id,
        label: share.label,
        format: share.format,
        expiresAt: share.expiresAt?.toISOString() ?? null,
        createdAt: share.createdAt.toISOString(),
        url: reportSharePublicUrl(share.token),
        createdBy: share.createdBy,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { session } = await requireReportAccess(id);
    const parsed = createReportShareBodySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Invalid request body",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }

    const share = await createReportShare({
      reportId: id,
      userId: session.userId,
      label: parsed.data.label,
      expiresInDays: parsed.data.expiresInDays,
      format: parsed.data.format,
    });

    return apiSuccess(
      {
        id: share.id,
        label: share.label,
        format: share.format,
        expiresAt: share.expiresAt?.toISOString() ?? null,
        createdAt: share.createdAt.toISOString(),
        url: reportSharePublicUrl(share.token),
      },
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
