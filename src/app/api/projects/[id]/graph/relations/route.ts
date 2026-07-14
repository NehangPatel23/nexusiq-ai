export const dynamic = "force-dynamic";

import { requireProjectGraphAccess } from "@/features/graph/lib/authorization";
import { createGraphRelation } from "@/features/graph/lib/graph-data";
import { createGraphRelationBodySchema } from "@/features/graph/schemas";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    await requireProjectGraphAccess(id);

    const parsed = createGraphRelationBodySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Invalid request body",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }

    if (parsed.data.sourceEntityId === parsed.data.targetEntityId) {
      return apiError("VALIDATION_ERROR", "Source and target must be different nodes", 400);
    }

    try {
      const relation = await createGraphRelation({
        projectId: id,
        sourceEntityId: parsed.data.sourceEntityId,
        targetEntityId: parsed.data.targetEntityId,
        relationType: parsed.data.relationType,
        confidence: parsed.data.confidence,
      });
      return apiSuccess({ relation }, 201);
    } catch (error) {
      if (error instanceof Error && error.message.includes("must belong")) {
        return apiError("VALIDATION_ERROR", error.message, 400);
      }
      throw error;
    }
  } catch (error) {
    return handleApiError(error);
  }
}
