export const dynamic = "force-dynamic";

import { requireProjectActionsAccess } from "@/features/actions/lib/authorization";
import {
  createTasksFromFindings,
  listOpenFindingsForPicker,
} from "@/features/actions/lib/tasks";
import { fromFindingsBodySchema } from "@/features/actions/schemas";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    await requireProjectActionsAccess(id);
    const findings = await listOpenFindingsForPicker(id);
    return apiSuccess({ findings });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { organizationId, session } = await requireProjectActionsAccess(id);

    const parsed = fromFindingsBodySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Invalid request body",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }

    const result = await createTasksFromFindings({
      projectId: id,
      organizationId,
      findingIds: parsed.data.findingIds,
      includeExecutiveActions: parsed.data.includeExecutiveActions ?? true,
      actorId: session.userId,
    });

    return apiSuccess(result, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
