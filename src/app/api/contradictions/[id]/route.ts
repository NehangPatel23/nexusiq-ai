export const dynamic = "force-dynamic";

import { requireContradictionAccess } from "@/features/contradictions/lib/authorization";
import { updateContradictionStatus } from "@/features/contradictions/lib/contradictions";
import { updateContradictionStatusBodySchema } from "@/features/contradictions/schemas";
import { getSession } from "@/lib/session";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    await requireContradictionAccess(id);
    const session = await getSession();

    const parsed = updateContradictionStatusBodySchema.safeParse(
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

    const contradiction = await updateContradictionStatus({
      id,
      status: parsed.data.status,
      severity: parsed.data.severity,
      resolutionNote: parsed.data.resolutionNote,
      statusChangedById: session?.user?.id ?? null,
    });

    return apiSuccess({ contradiction });
  } catch (error) {
    return handleApiError(error);
  }
}
