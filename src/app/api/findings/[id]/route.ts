export const dynamic = "force-dynamic";

import { updateFindingStatus } from "@/features/intelligence/lib/update-finding-status";
import { AuthError, requireSession } from "@/features/organizations/lib/authorization";
import { updateFindingStatusBodySchema } from "@/features/reports/schemas";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const session = await requireSession();
    const parsed = updateFindingStatusBodySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Invalid request body",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }

    const finding = await updateFindingStatus({
      findingId: id,
      userId: session.userId,
      status: parsed.data.status,
      severity: parsed.data.severity,
    });

    return apiSuccess({ finding });
  } catch (error) {
    if (error instanceof AuthError) {
      return handleApiError(error);
    }
    return handleApiError(error);
  }
}
