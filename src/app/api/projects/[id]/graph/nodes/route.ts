export const dynamic = "force-dynamic";

import { requireProjectGraphAccess } from "@/features/graph/lib/authorization";
import { createGraphNode } from "@/features/graph/lib/graph-data";
import { createGraphNodeBodySchema } from "@/features/graph/schemas";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    await requireProjectGraphAccess(id);

    const parsed = createGraphNodeBodySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Invalid request body",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }

    const node = await createGraphNode({
      projectId: id,
      name: parsed.data.name,
      type: parsed.data.type,
    });

    return apiSuccess({ node }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
