export const dynamic = "force-dynamic";

import { requireMissingItemAccess } from "@/features/missing/lib/authorization";
import { updateMissingItemStatus } from "@/features/missing/lib/missing-items";
import { updateMissingItemStatusBodySchema } from "@/features/missing/schemas";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    await requireMissingItemAccess(id);

    const parsed = updateMissingItemStatusBodySchema.safeParse(
      await request.json().catch(() => ({})),
    );
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Invalid request body",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }

    const item = await updateMissingItemStatus({
      id,
      status: parsed.data.status,
      severity: parsed.data.severity,
    });

    return apiSuccess({ item });
  } catch (error) {
    return handleApiError(error);
  }
}
