export const dynamic = "force-dynamic";

import { requireProjectContradictionsAccess } from "@/features/contradictions/lib/authorization";
import { listContradictions } from "@/features/contradictions/lib/contradictions";
import { listContradictionsQuerySchema } from "@/features/contradictions/schemas";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    await requireProjectContradictionsAccess(id);

    const url = new URL(request.url);
    const parsed = listContradictionsQuerySchema.safeParse({
      status: url.searchParams.get("status") ?? undefined,
      severity: url.searchParams.get("severity") ?? undefined,
    });
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Invalid query parameters",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }

    const contradictions = await listContradictions({
      projectId: id,
      status: parsed.data.status,
      severity: parsed.data.severity,
    });

    return apiSuccess({ contradictions });
  } catch (error) {
    return handleApiError(error);
  }
}
