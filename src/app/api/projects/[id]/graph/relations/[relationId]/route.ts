export const dynamic = "force-dynamic";

import { requireProjectGraphAccess } from "@/features/graph/lib/authorization";
import { deleteGraphRelation, updateGraphRelation } from "@/features/graph/lib/graph-data";
import { updateGraphRelationBodySchema } from "@/features/graph/schemas";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";

interface RouteContext {
  params: Promise<{ id: string; relationId: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id, relationId } = await context.params;
    await requireProjectGraphAccess(id);

    const parsed = updateGraphRelationBodySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Invalid request body",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }
    if (
      parsed.data.relationType === undefined &&
      parsed.data.confidence === undefined &&
      !parsed.data.reverse
    ) {
      return apiError("VALIDATION_ERROR", "Nothing to update", 400);
    }

    try {
      const relation = await updateGraphRelation({
        projectId: id,
        relationId,
        relationType: parsed.data.relationType,
        confidence: parsed.data.confidence,
        reverse: parsed.data.reverse,
      });
      if (!relation) return apiError("NOT_FOUND", "Relation not found", 404);
      return apiSuccess({ relation });
    } catch (error) {
      if (error instanceof Error && error.message.includes("identical relation")) {
        return apiError("CONFLICT", error.message, 409);
      }
      throw error;
    }
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id, relationId } = await context.params;
    await requireProjectGraphAccess(id);
    const deleted = await deleteGraphRelation({ projectId: id, relationId });
    if (!deleted) return apiError("NOT_FOUND", "Relation not found", 404);
    return apiSuccess({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
