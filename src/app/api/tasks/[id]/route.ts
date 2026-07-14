export const dynamic = "force-dynamic";

import { requireTaskAccess } from "@/features/actions/lib/authorization";
import { softDeleteTask, updateTask } from "@/features/actions/lib/tasks";
import { updateTaskBodySchema } from "@/features/actions/schemas";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { projectId, organizationId, session } = await requireTaskAccess(id);

    const parsed = updateTaskBodySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Invalid request body",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }

    const task = await updateTask({
      taskId: id,
      projectId,
      organizationId,
      actorId: session.userId,
      data: parsed.data,
    });

    return apiSuccess(task);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { projectId } = await requireTaskAccess(id);
    const result = await softDeleteTask(id, projectId);
    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
