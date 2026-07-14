export const dynamic = "force-dynamic";

import { requireEntityAccess } from "@/features/graph/lib/authorization";
import {
  deleteGraphNode,
  getEntityDetail,
  updateGraphNode,
} from "@/features/graph/lib/graph-data";
import { updateGraphNodeBodySchema } from "@/features/graph/schemas";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";

interface RouteContext {
  params: Promise<{ id: string; entityId: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id, entityId } = await context.params;
    await requireEntityAccess(entityId);
    const detail = await getEntityDetail({ projectId: id, entityId });
    if (!detail) return apiError("NOT_FOUND", "Entity not found", 404);
    return apiSuccess({ entity: detail });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id, entityId } = await context.params;
    await requireEntityAccess(entityId);

    const parsed = updateGraphNodeBodySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Invalid request body",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }
    if (parsed.data.name === undefined && parsed.data.type === undefined) {
      return apiError("VALIDATION_ERROR", "Provide name and/or type to update", 400);
    }

    try {
      const node = await updateGraphNode({
        projectId: id,
        entityId,
        name: parsed.data.name,
        type: parsed.data.type,
      });
      if (!node) return apiError("NOT_FOUND", "Entity not found", 404);
      return apiSuccess({ node });
    } catch (error) {
      if (error instanceof Error && error.message.includes("already uses")) {
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
    const { id, entityId } = await context.params;
    await requireEntityAccess(entityId);
    const deleted = await deleteGraphNode({ projectId: id, entityId });
    if (!deleted) return apiError("NOT_FOUND", "Entity not found", 404);
    return apiSuccess({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
